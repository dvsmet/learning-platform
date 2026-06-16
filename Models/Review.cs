using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace LearningPlatformAPI.Models
{
    [Table("reviews")]
    public class Review : IEntity
    {
        [Key]
        [Column("id")]
        public int Id { get; set; }

        [Required]
        [Column("user_id")]
        public int UserId { get; set; }

        [Required]
        [Column("course_id")]
        public int CourseId { get; set; }

        [Column("review_text")]
        public string? ReviewText { get; set; }

        [Required]
        [Range(1, 5)]
        [Column("rating")]
        public int Rating { get; set; }

        [Column("review_date")]
        public DateTime ReviewDate { get; set; } = DateTime.UtcNow;

        [ForeignKey("UserId")]
        public virtual User User { get; set; } = null!;

        [ForeignKey("CourseId")]
        public virtual Course Course { get; set; } = null!;
    }
}
