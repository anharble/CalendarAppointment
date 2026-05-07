namespace CalendarAppointment.DTOs
{
    public class CreateAppointmentRequest
    {
        public string Name { get; set; } = string.Empty;
        public string Location { get; set; } = string.Empty;
        public DateTime StartTime { get; set; }
        public DateTime EndTime { get; set; }
        public int UserID { get; set; }
        public bool IsGroupMeeting { get; set; }
        public List<int>? ParticipantIDs { get; set; }
    }

    public class UpdateAppointmentRequest
    {
        public string? Name { get; set; }
        public string? Location { get; set; }
        public DateTime? StartTime { get; set; }
        public DateTime? EndTime { get; set; }
    }

    public class AppointmentResponse
    {
        public int AppointmentID { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Location { get; set; } = string.Empty;
        public DateTime StartTime { get; set; }
        public DateTime EndTime { get; set; }
        public string Date { get; set; } = string.Empty;
        public bool IsGroupMeeting { get; set; }
        public List<ReminderResponse> Reminders { get; set; } = new List<ReminderResponse>();

        public List<UserParticipantResponse> Participants { get; set; } = new();
    }

    public class ReminderResponse
    {
        public int ReminderID { get; set; }
        public DateTime ReminderTime { get; set; }
        public string Message { get; set; } = string.Empty;
        public int AppointmentID { get; set; }
    }

    public class CreateReminderRequest
    {
        public int AppointmentID { get; set; }
        public DateTime ReminderTime { get; set; }
        public string Message { get; set; } = string.Empty;
    }

    public class UserParticipantResponse
    {
        public int UserID { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
    }

    public class ConflictResponse
    {
        public bool HasConflict { get; set; }
        public string Message { get; set; } = string.Empty;
        public AppointmentResponse? ConflictingAppointment { get; set; }
        public string Action { get; set; } = string.Empty;
    }

    public class GroupMeetingSuggestion
    {
        public bool HasSuggestion { get; set; }
        public string Message { get; set; } = string.Empty;
        public int? ExistingGroupMeetingID { get; set; }
        public string Action { get; set; } = string.Empty;
    }

    public class ReminderSuggestion
    {
        public string Message { get; set; } = string.Empty;
        public bool AddReminder { get; set; }
        public DateTime? ReminderTime { get; set; }
    }

    public class ApiResponse<T>
    {
        public bool Success { get; set; }
        public string Message { get; set; } = string.Empty;
        public T? Data { get; set; }
        public ConflictResponse? ConflictInfo { get; set; }
        public GroupMeetingSuggestion? GroupMeetingSuggestion { get; set; }
        public ReminderSuggestion? ReminderSuggestion { get; set; }
    }
}
