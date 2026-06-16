using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace MyWebApi.Migrations
{
    /// <inheritdoc />
    public partial class InitialBaseline : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // БД уже существует — пустая миграция-снимок
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
        }
    }
}
