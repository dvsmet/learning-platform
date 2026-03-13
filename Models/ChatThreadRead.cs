using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace LearningPlatformAPI.Models
{
    [Table("chat_thread_read")]
    public class ChatThreadRead
    {
        [Key]
        [Column("id")]
        public int Id { get; set; }

        [Required]
        [Column("reader_id")]
        public int ReaderId { get; set; }

        [Required]
        [Column("user_id")]
        public int UserId { get; set; }

        [Required]
        [Column("course_id")]
        public int CourseId { get; set; }

        [Required]
        [Column("last_read_at")]
        public DateTime LastReadAt { get; set; }

        [ForeignKey("ReaderId")]
        public virtual User? Reader { get; set; }
    }
}
