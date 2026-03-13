using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace LearningPlatformAPI.Models
{
    [Table("quiz_questions")]
    public class QuizQuestion : IEntity
    {
        [Key]
        [Column("id")]
        public int Id { get; set; }

        [Required]
        [Column("quiz_id")]
        public int QuizId { get; set; }

        [Required]
        [Column("question_text")]
        public string QuestionText { get; set; } = string.Empty;

        [ForeignKey("QuizId")]
        public virtual Quiz Quiz { get; set; } = null!;

        public virtual ICollection<QuizOption> Options { get; set; } = new List<QuizOption>();
    }
}
