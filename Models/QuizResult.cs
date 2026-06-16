using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace LearningPlatformAPI.Models
{
    [Table("quiz_results")]
    public class QuizResult : IEntity
    {
        [Key]
        [Column("id")]
        public int Id { get; set; }

        [Required]
        [Column("user_id")]
        public int UserId { get; set; }

        [Required]
        [Column("quiz_id")]
        public int QuizId { get; set; }

        [Required]
        [Column("score")]
        public int Score { get; set; }

        [Column("completion_date")]
        public DateTime CompletionDate { get; set; } = DateTime.UtcNow;

        [ForeignKey("UserId")]
        public virtual User User { get; set; } = null!;

        [ForeignKey("QuizId")]
        public virtual Quiz Quiz { get; set; } = null!;
    }
}
