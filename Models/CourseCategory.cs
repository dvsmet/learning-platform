using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace LearningPlatformAPI.Models
{
    [Table("course_category")]
    public class CourseCategory
    {
        [Key]
        [Column("course_id", Order = 0)]
        public int CourseId { get; set; }

        [Key]
        [Column("category_id", Order = 1)]
        public int CategoryId { get; set; }

        [ForeignKey("CourseId")]
        public virtual Course Course { get; set; } = null!;

        [ForeignKey("CategoryId")]
        public virtual CourseCategories CourseCategories { get; set; } = null!;
    }
}
