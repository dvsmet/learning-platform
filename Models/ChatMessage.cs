using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace LearningPlatformAPI.Models
{
    [Table("chat_messages")]
    public class ChatMessage : IEntity
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

        [Required]
        [Column("sender_id")]
        public int SenderId { get; set; }

        [Required]
        [MaxLength(2000)]
        [Column("text")]
        public string Text { get; set; } = string.Empty;

        [Column("sent_at")]
        public DateTime SentAt { get; set; } = DateTime.UtcNow;

        [ForeignKey("UserId")]
        public virtual User? User { get; set; }

        [ForeignKey("CourseId")]
        public virtual Course? Course { get; set; }

        [ForeignKey("SenderId")]
        public virtual User? Sender { get; set; }
    }
}
