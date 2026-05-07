using CalendarAppointment.Data;
using CalendarAppointment.Models;
using CalendarAppointment.DTOs;
using Microsoft.EntityFrameworkCore;

namespace CalendarAppointment.Services
{
    public interface IAppointmentService
    {
        ApiResponse<AppointmentResponse> AddAppointment(CreateAppointmentRequest request);
        ApiResponse<AppointmentResponse> UpdateAppointment(int id, UpdateAppointmentRequest request);
        ApiResponse<bool> DeleteAppointment(int id);
        ApiResponse<List<AppointmentResponse>> GetAllAppointments();
        ApiResponse<AppointmentResponse> GetAppointmentById(int id);
        ApiResponse<ReminderResponse> AddReminder(CreateReminderRequest request);
        ApiResponse<AppointmentResponse> ResolveConflict(int appointmentId, string action, int? conflictingAppointmentId = null);
        ApiResponse<AppointmentResponse> JoinGroupMeeting(int groupMeetingId, int userId);
        ApiResponse<List<ReminderResponse>> GetAllReminders();
    }

    public class AppointmentService : IAppointmentService
    {
        private readonly AppointmentDbContext _context;

        public AppointmentService(AppointmentDbContext context)
        {
            _context = context;
        }

        public ApiResponse<AppointmentResponse> AddAppointment(CreateAppointmentRequest request)
        {
            var response = new ApiResponse<AppointmentResponse>();
            var validationError = ValidateAppointmentData(request.Name, request.Location, request.StartTime, request.EndTime);
            if (validationError != null)
            {
                response.Success = false;
                response.Message = validationError;
                return response;
            }
            var user = _context.Users.FirstOrDefault(u => u.UserID == request.UserID);
            if (user == null)
            {
                response.Success = false;
                response.Message = "Người dùng không tồn tại";
                return response;
            }
            var conflictingAppointment = CheckForConflict(request.UserID, request.StartTime, request.EndTime);
            if (conflictingAppointment != null)
            {
                response.Success = false;
                response.Message = "Phát hiện trùng lịch";
                response.ConflictInfo = new ConflictResponse
                {
                    HasConflict = true,
                    Message = "Phát hiện trùng lịch. Vui lòng chọn hành động: đổi thời gian (change_time) hoặc thay thế lịch cũ (replace)",
                    ConflictingAppointment = MapToAppointmentResponse(conflictingAppointment),
                    Action = "Cần xác nhận từ người dùng"
                };
                return response;
            }
            if (request.IsGroupMeeting)
            {
                var duration = request.EndTime - request.StartTime;
                var existingGroupMeeting = _context.Appointments
                    .OfType<GroupMeeting>()
                    .AsEnumerable() 
                    .FirstOrDefault(gm => gm.Name == request.Name && (gm.EndTime - gm.StartTime) == duration);
                if (existingGroupMeeting != null)
                {
                    response.Success = false;
                    response.Message = "Tìm thấy cuộc họp nhóm tương tự";
                    response.GroupMeetingSuggestion = new GroupMeetingSuggestion
                    {
                        HasSuggestion = true,
                        Message = $"Đã tồn tại cuộc họp nhóm '{request.Name}' với cùng thời lượng. Bạn có muốn tham gia cuộc họp này không? (join) hoặc tạo mới (create_new)",
                        ExistingGroupMeetingID = existingGroupMeeting.AppointmentID,
                        Action = "Cần xác nhận từ người dùng"
                    };
                    return response;
                }
            }
            Appointment newAppointment;
            if (request.IsGroupMeeting)
            {
                var groupMeeting = new GroupMeeting { Name = request.Name, Location = request.Location, StartTime = request.StartTime, EndTime = request.EndTime, User = user };
                if (request.ParticipantIDs != null && request.ParticipantIDs.Any())
                {
                    foreach (var participantId in request.ParticipantIDs)
                    {
                        var participant = _context.Users.FirstOrDefault(u => u.UserID == participantId);
                        if (participant != null) { groupMeeting.Participants.Add(participant); }
                    }
                }
                newAppointment = groupMeeting;
            }
            else
            {
                newAppointment = new Appointment { Name = request.Name, Location = request.Location, StartTime = request.StartTime, EndTime = request.EndTime, User = user };
            }
            _context.Appointments.Add(newAppointment);
            _context.SaveChanges();
            response.Success = true;
            response.Message = "Thêm lịch hẹn thành công";
            response.Data = MapToAppointmentResponse(newAppointment);
            response.ReminderSuggestion = new ReminderSuggestion { Message = "Bạn có muốn thêm lời nhắc cho lịch hẹn này không?", AddReminder = false };
            return response;
        }

        public ApiResponse<AppointmentResponse> ResolveConflict(int appointmentId, string action, int? conflictingAppointmentId = null)
        {
            var response = new ApiResponse<AppointmentResponse>();
            if (action == "replace" && conflictingAppointmentId.HasValue)
            {
                var oldAppointment = _context.Appointments.FirstOrDefault(a => a.AppointmentID == conflictingAppointmentId.Value);
                if (oldAppointment != null) { _context.Appointments.Remove(oldAppointment); _context.SaveChanges(); }
                response.Success = true;
                response.Message = "Đã thay thế lịch cũ. Vui lòng tạo lại lịch hẹn mới.";
            }
            else if (action == "change_time")
            {
                response.Success = true;
                response.Message = "Vui lòng chọn thời gian khác và tạo lại lịch hẹn.";
            }
            else
            {
                response.Success = false;
                response.Message = "Hành động không hợp lệ";
            }
            return response;
        }

        public ApiResponse<AppointmentResponse> JoinGroupMeeting(int groupMeetingId, int userId)
        {
            var response = new ApiResponse<AppointmentResponse>();
            var groupMeeting = _context.Appointments.OfType<GroupMeeting>().Include(gm => gm.Participants).Include(gm => gm.User).FirstOrDefault(gm => gm.AppointmentID == groupMeetingId);
            if (groupMeeting == null) { response.Success = false; response.Message = "Không tìm thấy cuộc họp nhóm"; return response; }
            var user = _context.Users.FirstOrDefault(u => u.UserID == userId);
            if (user == null) { response.Success = false; response.Message = "Người dùng không tồn tại"; return response; }
            if (groupMeeting.Participants.Any(p => p.UserID == userId)) { response.Success = false; response.Message = "Bạn đã tham gia cuộc họp này rồi"; return response; }
            groupMeeting.Participants.Add(user);
            _context.SaveChanges();
            response.Success = true;
            response.Message = "Tham gia cuộc họp nhóm thành công";
            response.Data = MapToAppointmentResponse(groupMeeting);
            return response;
        }

        public ApiResponse<AppointmentResponse> UpdateAppointment(int id, UpdateAppointmentRequest request)
        {
            var response = new ApiResponse<AppointmentResponse>();
            var appointment = _context.Appointments.Include(a => a.User).FirstOrDefault(a => a.AppointmentID == id);
            if (appointment == null) { response.Success = false; response.Message = "Không tìm thấy lịch hẹn"; return response; }
            if (!string.IsNullOrEmpty(request.Name)) appointment.Name = request.Name;
            if (!string.IsNullOrEmpty(request.Location)) appointment.Location = request.Location;
            if (request.StartTime.HasValue) appointment.StartTime = request.StartTime.Value;
            if (request.EndTime.HasValue) appointment.EndTime = request.EndTime.Value;
            var validationError = ValidateAppointmentData(appointment.Name, appointment.Location, appointment.StartTime, appointment.EndTime);
            if (validationError != null) { response.Success = false; response.Message = validationError; return response; }
            if (appointment.User != null)
            {
                var conflictingAppointment = _context.Appointments.Where(a => a.User!.UserID == appointment.User.UserID && a.AppointmentID != id).FirstOrDefault(a => (appointment.StartTime < a.EndTime && appointment.EndTime > a.StartTime));
                if (conflictingAppointment != null) { response.Success = false; response.Message = "Phát hiện trùng lịch"; response.ConflictInfo = new ConflictResponse { HasConflict = true, Message = "Phát hiện trùng lịch. Vui lòng chọn thời gian khác", ConflictingAppointment = MapToAppointmentResponse(conflictingAppointment) }; return response; }
            }
            _context.SaveChanges();
            response.Success = true;
            response.Message = "Cập nhật lịch hẹn thành công";
            response.Data = MapToAppointmentResponse(appointment);
            return response;
        }

        public ApiResponse<bool> DeleteAppointment(int id)
        {
            var response = new ApiResponse<bool>();
            var appointment = _context.Appointments.Include(a => a.Reminders).FirstOrDefault(a => a.AppointmentID == id);
            if (appointment == null) { response.Success = false; response.Message = "Không tìm thấy lịch hẹn"; return response; }
            _context.Appointments.Remove(appointment);
            _context.SaveChanges();
            response.Success = true;
            response.Message = "Xóa lịch hẹn thành công";
            response.Data = true;
            return response;
        }

        public ApiResponse<List<AppointmentResponse>> GetAllAppointments()
        {
            var appointments = _context.Appointments
                             .Include(a => a.User)
                             .Include(a => a.Reminders)
                             .Include("Participants") 
                             .ToList();
            var response = new ApiResponse<List<AppointmentResponse>> { Success = true, Message = "Lấy danh sách lịch hẹn thành công", Data = appointments.Select(MapToAppointmentResponse).ToList() };
            return response;
        }

        public ApiResponse<AppointmentResponse> GetAppointmentById(int id)
        {
            var response = new ApiResponse<AppointmentResponse>();
            var appointment = _context.Appointments
                .Include(a => a.User)
                .Include(a => a.Reminders)
                .Include("Participants") 
                .FirstOrDefault(a => a.AppointmentID == id);

            if (appointment == null)
            {
                response.Success = false;
                response.Message = "Không tìm thấy lịch hẹn";
                return response;
            }

            response.Success = true;
            response.Data = MapToAppointmentResponse(appointment);
            return response;
        }

        public ApiResponse<ReminderResponse> AddReminder(CreateReminderRequest request)
        {
            var response = new ApiResponse<ReminderResponse>();
            var appointment = _context.Appointments.Include(a => a.Reminders).FirstOrDefault(a => a.AppointmentID == request.AppointmentID);

            if (appointment == null) {  }

            var reminder = new Reminder
            {
                ReminderTime = request.ReminderTime,
                Message = request.Message, 
                Appointment = appointment
            };

            _context.Reminders.Add(reminder);
            _context.SaveChanges();

            response.Data = new ReminderResponse
            {
                ReminderID = reminder.ReminderID,
                ReminderTime = reminder.ReminderTime,
                Message = reminder.Message
            };
            return response;
        }

        public ApiResponse<List<ReminderResponse>> GetAllReminders()
        {
            var response = new ApiResponse<List<ReminderResponse>>();
            try
            {
                // Lấy danh sách từ Database và map sang DTO (Response)
                var reminders = _context.Reminders
                    .Select(r => new ReminderResponse
                    {
                        ReminderID = r.ReminderID,
                        ReminderTime = r.ReminderTime,
                        Message = r.Message,
                        AppointmentID = r.AppointmentID
                    })
                    .ToList();

                response.Success = true;
                response.Data = reminders;
            }
            catch (Exception ex)
            {
                response.Success = false;
                response.Message = "Lỗi khi lấy danh sách bộ nhắc: " + ex.Message;
            }
            return response;
        }

        private string? ValidateAppointmentData(string name, string location, DateTime startTime, DateTime endTime)
        {
            if (string.IsNullOrWhiteSpace(name)) return "Tên lịch hẹn không được để trống";
            if (string.IsNullOrWhiteSpace(location)) return "Địa điểm không được để trống";
            if (endTime <= startTime) return "Thời gian kết thúc phải lớn hơn thời gian bắt đầu";
            return null;
        }

        private Appointment? CheckForConflict(int userId, DateTime startTime, DateTime endTime)
        {
            return _context.Appointments.Where(a => a.User!.UserID == userId).FirstOrDefault(a => (startTime < a.EndTime && endTime > a.StartTime));
        }

        private AppointmentResponse MapToAppointmentResponse(Appointment appointment)
        {
            var response = new AppointmentResponse
            {
                AppointmentID = appointment.AppointmentID,
                Name = appointment.Name,
                Location = appointment.Location,
                StartTime = appointment.StartTime,
                EndTime = appointment.EndTime,
                Date = appointment.StartTime.ToString("dd/MM/yyyy"),
                IsGroupMeeting = appointment is GroupMeeting,
                Reminders = appointment.Reminders.Select(r => new ReminderResponse
                {
                    ReminderID = r.ReminderID,
                    ReminderTime = r.ReminderTime,
                    Message = r.Message 
                }).ToList()
            };
            if (appointment is GroupMeeting groupMeeting)
            {
                if (!_context.Entry(groupMeeting).Collection(gm => gm.Participants).IsLoaded)
                {
                    _context.Entry(groupMeeting).Collection(gm => gm.Participants).Load();
                }
                response.Participants = groupMeeting.Participants.Select(p => new UserParticipantResponse
                {
                    UserID = p.UserID,
                    Name = p.Name,
                    Email = p.Email
                }).ToList();
            }
            return response;
        }
    }
}
