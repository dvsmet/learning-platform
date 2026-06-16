using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace LearningPlatformAPI.Models
{
    [Table("quizzes")]
    public class Quiz : IEntity
    {
        [Key]
        [Column("id")]
        public int Id { get; set; }

        [Required]
        [MaxLength(200)]
        [Column("title")]
        public string Title { get; set; } = string.Empty;

        [Required]
        [Column("lesson_id")]
        public int LessonId { get; set; }

        [Required]
        [Column("max_score")]
        public int MaxScore { get; set; }

        [ForeignKey("LessonId")]
        public virtual Lesson? Lesson { get; set; } = null!;
        
        public virtual ICollection<QuizResult> QuizResults { get; set; } = new List<QuizResult>();

        // Добавлено: вопросы теста
        public virtual ICollection<QuizQuestion> Questions { get; set; } = new List<QuizQuestion>();
    }
}
