using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MyWebApi.Migrations
{
    /// <inheritdoc />
    public partial class UpdateOrderStatusConstraint : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check");
            migrationBuilder.Sql("UPDATE orders SET status = 'approved' WHERE status = 'paid'");
            migrationBuilder.Sql("UPDATE orders SET status = 'rejected' WHERE status = 'cancelled'");
            migrationBuilder.Sql(
                "ALTER TABLE orders ADD CONSTRAINT orders_status_check " +
                "CHECK (status IN ('pending', 'approved', 'rejected'))");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check");
            migrationBuilder.Sql("UPDATE orders SET status = 'paid' WHERE status = 'approved'");
            migrationBuilder.Sql("UPDATE orders SET status = 'cancelled' WHERE status = 'rejected'");
            migrationBuilder.Sql(
                "ALTER TABLE orders ADD CONSTRAINT orders_status_check " +
                "CHECK (status IN ('pending', 'paid', 'cancelled'))");
        }
    }
}
