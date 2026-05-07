namespace CalendarAppointment.Models
{
    public class Calendar
    {
        public int CalendarID { get; set; }
        public List<Appointment> Appointments { get; set; } = new List<Appointment>();
        public User? User { get; set; }
    }
}
