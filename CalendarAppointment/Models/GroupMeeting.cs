namespace CalendarAppointment.Models
{
    public class GroupMeeting : Appointment
    {
        public List<User> Participants { get; set; } = new List<User>();
    }
}
