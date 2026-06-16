using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace LearningPlatformAPI.Models
{
    [Table("lessons")]
    public class Lesson : IEntity
    {
        [Key]
        [Column("id")]
        public int Id { get; set; }

        [Required]
        [Column("course_id")]
        public int CourseId { get; set; }

        [Required]
        [Column("lesson_number")]
        public int LessonNumber { get; set; }

        [Required]
        [MaxLength(200)]
        [Column("title")]
        public string Title { get; set; } = string.Empty;

        [Column("content")]
        public string? Content { get; set; }

        [Column("video_url")]
        [MaxLength(500)]
        public string? VideoUrl { get; set; }

        [Column("materials_note")]
        public string? MaterialsNote { get; set; }

        [ForeignKey("CourseId")]
        public virtual Course? Course { get; set; } = null!;
        
        public virtual ICollection<Quiz> Quizzes { get; set; } = new List<Quiz>();
        public virtual ICollection<LearningProgress> LearningProgresses { get; set; } = new List<LearningProgress>();
    }
}
