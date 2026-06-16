using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace LearningPlatformAPI.Models
{
    [Table("quiz_options")]
    public class QuizOption : IEntity
    {
        [Key]
        [Column("id")]
        public int Id { get; set; }

        [Required]
        [Column("question_id")]
        public int QuestionId { get; set; }

        [Required]
        [Column("option_text")]
        public string OptionText { get; set; } = string.Empty;

        [Required]
        [Column("is_correct")]
        public bool IsCorrect { get; set; }

        [ForeignKey("QuestionId")]
        public virtual QuizQuestion Question { get; set; } = null!;
    }
}
