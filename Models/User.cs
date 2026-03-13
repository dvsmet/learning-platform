using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace LearningPlatformAPI.Models
{
    [Table("users")]
    public class User : IEntity
    {
        [Key]
        [Column("id")]
        public int Id { get; set; }

        [Required]
        [MaxLength(100)]
        [Column("name")]
        public string Name { get; set; } = string.Empty;

        [Required]
        [MaxLength(255)]
        [Column("email")]
        public string Email { get; set; } = string.Empty;

        [Required]
        [MaxLength(255)]
        [Column("password")]
        public string Password { get; set; } = string.Empty;

        [Column("registration_date")]
        public DateTime RegistrationDate { get; set; } = DateTime.UtcNow;

        [Column("is_instructor")]
        public bool IsInstructor { get; set; } = false;

        [Column("is_admin")]
        public bool IsAdmin { get; set; } = false;

        public virtual ICollection<Order> Orders { get; set; } = new List<Order>();
        public virtual ICollection<Course> InstructedCourses { get; set; } = new List<Course>();
        public virtual ICollection<Review> Reviews { get; set; } = new List<Review>();
        public virtual ICollection<QuizResult> QuizResults { get; set; } = new List<QuizResult>();
        public virtual ICollection<LearningProgress> LearningProgresses { get; set; } = new List<LearningProgress>();
    }
}

