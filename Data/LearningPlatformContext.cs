using Microsoft.EntityFrameworkCore;
using LearningPlatformAPI.Models;

namespace LearningPlatformAPI.Data
{
    public class LearningPlatformContext : DbContext
    {
        public LearningPlatformContext(DbContextOptions<LearningPlatformContext> options)
            : base(options)
        {
        }

        public DbSet<User> Users { get; set; }
        public DbSet<Course> Courses { get; set; }
        public DbSet<CourseCategories> CourseCategories { get; set; }
        public DbSet<CourseCategory> CourseCategory { get; set; }
        public DbSet<Order> Orders { get; set; }
        public DbSet<OrderItem> OrderItems { get; set; }
        public DbSet<Review> Reviews { get; set; }
        public DbSet<Lesson> Lessons { get; set; }
        public DbSet<Quiz> Quizzes { get; set; }
        public DbSet<QuizResult> QuizResults { get; set; }
        public DbSet<LearningProgress> LearningProgresses { get; set; }
        public DbSet<QuizQuestion> QuizQuestions { get; set; }
        public DbSet<QuizOption> QuizOptions { get; set; }
        public DbSet<ChatMessage> ChatMessages { get; set; }
        public DbSet<ChatThreadRead> ChatThreadReads { get; set; }
        public DbSet<ChatMessageHidden> ChatMessageHiddens { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<CourseCategory>()
                .HasKey(cc => new { cc.CourseId, cc.CategoryId });

            // User -> Orders
            modelBuilder.Entity<Order>()
                .HasOne(o => o.User)
                .WithMany(u => u.Orders)
                .HasForeignKey(o => o.UserId)
                .OnDelete(DeleteBehavior.Restrict);

            // User -> Courses
            modelBuilder.Entity<Course>()
                .HasOne(c => c.Instructor)
                .WithMany(u => u.InstructedCourses)
                .HasForeignKey(c => c.InstructorId)
                .OnDelete(DeleteBehavior.Restrict);

            // Order -> OrderItems
            modelBuilder.Entity<OrderItem>()
                .HasOne(oi => oi.Order)
                .WithMany(o => o.OrderItems)
                .HasForeignKey(oi => oi.OrderId)
                .OnDelete(DeleteBehavior.Cascade);

            // Course -> OrderItems
            modelBuilder.Entity<OrderItem>()
                .HasOne(oi => oi.Course)
                .WithMany(c => c.OrderItems)
                .HasForeignKey(oi => oi.CourseId)
                .OnDelete(DeleteBehavior.Restrict);

            // User -> Reviews
            modelBuilder.Entity<Review>()
                .HasOne(r => r.User)
                .WithMany(u => u.Reviews)
                .HasForeignKey(r => r.UserId)
                .OnDelete(DeleteBehavior.Restrict);

            // Course -> Reviews
            modelBuilder.Entity<Review>()
                .HasOne(r => r.Course)
                .WithMany(c => c.Reviews)
                .HasForeignKey(r => r.CourseId)
                .OnDelete(DeleteBehavior.Cascade);

            // Course -> Lessons
            modelBuilder.Entity<Lesson>()
                .HasOne(l => l.Course)
                .WithMany(c => c.Lessons)
                .HasForeignKey(l => l.CourseId)
                .OnDelete(DeleteBehavior.Cascade);

            // Lesson -> Quizzes
            modelBuilder.Entity<Quiz>()
                .HasOne(q => q.Lesson)
                .WithMany(l => l.Quizzes)
                .HasForeignKey(q => q.LessonId)
                .OnDelete(DeleteBehavior.Cascade);

            // Quiz -> Questions
            modelBuilder.Entity<QuizQuestion>()
                .HasOne(q => q.Quiz)
                .WithMany(z => z.Questions)
                .HasForeignKey(q => q.QuizId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<QuizQuestion>()
                .Property(q => q.QuestionText)
                .HasMaxLength(2000);

            // Question -> Options
            modelBuilder.Entity<QuizOption>()
                .HasOne(o => o.Question)
                .WithMany(q => q.Options)
                .HasForeignKey(o => o.QuestionId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<QuizOption>()
                .Property(o => o.OptionText)
                .HasMaxLength(1000);

            // User -> QuizResults
            modelBuilder.Entity<QuizResult>()
                .HasOne(qr => qr.User)
                .WithMany(u => u.QuizResults)
                .HasForeignKey(qr => qr.UserId)
                .OnDelete(DeleteBehavior.Restrict);

            // Quiz -> QuizResults
            modelBuilder.Entity<QuizResult>()
                .HasOne(qr => qr.Quiz)
                .WithMany(q => q.QuizResults)
                .HasForeignKey(qr => qr.QuizId)
                .OnDelete(DeleteBehavior.Cascade);

            // User -> LearningProgress
            modelBuilder.Entity<LearningProgress>()
                .HasOne(lp => lp.User)
                .WithMany(u => u.LearningProgresses)
                .HasForeignKey(lp => lp.UserId)
                .OnDelete(DeleteBehavior.Restrict);

            // Lesson -> LearningProgress
            modelBuilder.Entity<LearningProgress>()
                .HasOne(lp => lp.Lesson)
                .WithMany(l => l.LearningProgresses)
                .HasForeignKey(lp => lp.LessonId)
                .OnDelete(DeleteBehavior.Cascade);

            // Course -> CourseCategories
            modelBuilder.Entity<CourseCategory>()
                .HasOne(cc => cc.Course)
                .WithMany(c => c.CourseCategory)
                .HasForeignKey(cc => cc.CourseId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<CourseCategory>()
                .HasOne(cc => cc.CourseCategories)
                .WithMany(cc => cc.CourseCategory)
                .HasForeignKey(cc => cc.CategoryId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<Course>()
                .Property(c => c.Price)
                .HasColumnType("decimal(10,2)");

            modelBuilder.Entity<OrderItem>()
                .Property(oi => oi.PriceAtPurchase)
                .HasColumnType("decimal(10,2)");

            modelBuilder.Entity<User>()
                .HasIndex(u => u.Email)
                .IsUnique();

            modelBuilder.Entity<Order>()
                .HasIndex(o => o.OrderDate);

            modelBuilder.Entity<Review>()
                .HasIndex(r => r.ReviewDate);

            // ChatMessage: User (сотрудник) + Course thread
            modelBuilder.Entity<ChatMessage>()
                .HasOne(cm => cm.User)
                .WithMany()
                .HasForeignKey(cm => cm.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<ChatMessage>()
                .HasOne(cm => cm.Course)
                .WithMany()
                .HasForeignKey(cm => cm.CourseId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<ChatMessage>()
                .HasOne(cm => cm.Sender)
                .WithMany()
                .HasForeignKey(cm => cm.SenderId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<ChatMessage>()
                .HasIndex(cm => new { cm.UserId, cm.CourseId });

            modelBuilder.Entity<ChatThreadRead>()
                .HasIndex(ctr => new { ctr.ReaderId, ctr.UserId, ctr.CourseId })
                .IsUnique();

            modelBuilder.Entity<ChatMessageHidden>()
                .HasOne(h => h.Message)
                .WithMany()
                .HasForeignKey(h => h.MessageId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<ChatMessageHidden>()
                .HasOne(h => h.User)
                .WithMany()
                .HasForeignKey(h => h.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<ChatMessageHidden>()
                .HasIndex(h => new { h.MessageId, h.UserId })
                .IsUnique();
        }
    }
}
