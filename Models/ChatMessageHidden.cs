using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace LearningPlatformAPI.Models
{
    [Table("chat_message_hidden")]
    public class ChatMessageHidden
    {
        [Key]
        [Column("id")]
        public int Id { get; set; }

        [Required]
        [Column("message_id")]
        public int MessageId { get; set; }

        [Required]
        [Column("user_id")]
        public int UserId { get; set; }

        [ForeignKey("MessageId")]
        public virtual ChatMessage? Message { get; set; }

        [ForeignKey("UserId")]
        public virtual User? User { get; set; }
    }
}
