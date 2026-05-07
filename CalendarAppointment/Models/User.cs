namespace CalendarAppointment.Models
{
    public class User
    {
        public int UserID { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public List<Appointment> Appointments { get; set; } = new List<Appointment>();
    }
}
