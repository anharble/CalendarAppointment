namespace CalendarAppointment.Models
{
    public class Reminder
    {
        public int ReminderID { get; set; }
        public DateTime ReminderTime { get; set; }
        public string Message { get; set; } = string.Empty;
        public int AppointmentID { get; set; }
        public Appointment? Appointment { get; set; }
    }
}
