namespace CalendarAppointment.Models
{
    public class Appointment
    {
        public int AppointmentID { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Location { get; set; } = string.Empty;
        public DateTime StartTime { get; set; }
        public DateTime EndTime { get; set; }
        public List<Reminder> Reminders { get; set; } = new List<Reminder>();
        public User? User { get; set; }
    }
}
