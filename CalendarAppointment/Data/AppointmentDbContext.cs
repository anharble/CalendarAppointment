using Microsoft.EntityFrameworkCore;
using CalendarAppointment.Models;

namespace CalendarAppointment.Data
{
    public class AppointmentDbContext : DbContext
    {
        public AppointmentDbContext(DbContextOptions<AppointmentDbContext> options) : base(options) { }

        public DbSet<User> Users { get; set; }
        public DbSet<Appointment> Appointments { get; set; }
        public DbSet<Reminder> Reminders { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<Appointment>()
                .HasDiscriminator<bool>("IsGroupMeeting")
                .HasValue<Appointment>(false)
                .HasValue<GroupMeeting>(true);

            modelBuilder.Entity<GroupMeeting>()
                .HasMany(m => m.Participants)
                .WithMany()
                .UsingEntity(j => j.ToTable("GroupMeeting_Participants"));
        }
    }
}