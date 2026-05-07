using Microsoft.AspNetCore.Mvc;
using CalendarAppointment.DTOs;
using CalendarAppointment.Services;

namespace CalendarAppointment.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AppointmentsController : ControllerBase
    {
        private readonly IAppointmentService _appointmentService;

        public AppointmentsController(IAppointmentService appointmentService)
        {
            _appointmentService = appointmentService;
        }

        [HttpPost]
        public ActionResult<ApiResponse<AppointmentResponse>> AddAppointment([FromBody] CreateAppointmentRequest request)
        {
            var result = _appointmentService.AddAppointment(request);

            if (!result.Success)
            {
                if (result.ConflictInfo != null || result.GroupMeetingSuggestion != null)
                {
                    return Ok(result);
                }
                return BadRequest(result);
            }

            return Ok(result);
        }

        [HttpPost("resolve-conflict")]
        public ActionResult<ApiResponse<AppointmentResponse>> ResolveConflict(
            [FromQuery] int appointmentId,
            [FromQuery] string action,
            [FromQuery] int? conflictingAppointmentId = null)
        {
            var result = _appointmentService.ResolveConflict(appointmentId, action, conflictingAppointmentId);

            if (!result.Success)
            {
                return BadRequest(result);
            }

            return Ok(result);
        }

        [HttpPost("{groupMeetingId}/join")]
        public ActionResult<ApiResponse<AppointmentResponse>> JoinGroupMeeting(
            int groupMeetingId,
            [FromQuery] int userId)
        {
            var result = _appointmentService.JoinGroupMeeting(groupMeetingId, userId);

            if (!result.Success)
            {
                return BadRequest(result);
            }

            return Ok(result);
        }

        [HttpPut("{id}")]
        public ActionResult<ApiResponse<AppointmentResponse>> UpdateAppointment(
            int id,
            [FromBody] UpdateAppointmentRequest request)
        {
            var result = _appointmentService.UpdateAppointment(id, request);

            if (!result.Success)
            {
                return BadRequest(result);
            }

            return Ok(result);
        }

        [HttpDelete("{id}")]
        public ActionResult<ApiResponse<bool>> DeleteAppointment(int id)
        {
            var result = _appointmentService.DeleteAppointment(id);

            if (!result.Success)
            {
                return NotFound(result);
            }

            return Ok(result);
        }

        [HttpGet]
        public ActionResult<ApiResponse<List<AppointmentResponse>>> GetAllAppointments()
        {
            var result = _appointmentService.GetAllAppointments();
            return Ok(result);
        }

        [HttpGet("{id}")]
        public ActionResult<ApiResponse<AppointmentResponse>> GetAppointmentById(int id)
        {
            var result = _appointmentService.GetAppointmentById(id);

            if (!result.Success)
            {
                return NotFound(result);
            }

            return Ok(result);
        }

        [HttpPost("reminders")]
        public ActionResult<ApiResponse<ReminderResponse>> AddReminder([FromBody] CreateReminderRequest request)
        {
            var result = _appointmentService.AddReminder(request);

            if (!result.Success)
            {
                return BadRequest(result);
            }

            return Ok(result);
        }

        [HttpGet("reminders/all")] 
        public ActionResult<ApiResponse<List<ReminderResponse>>> GetAllReminders()
        {
            var result = _appointmentService.GetAllReminders();
            return Ok(result);
        }
    }
}
