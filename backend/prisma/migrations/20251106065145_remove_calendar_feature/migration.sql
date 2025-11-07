/*
  Warnings:

  - You are about to drop the `CalendarEvent` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `WeeklyFocus` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."CalendarEvent" DROP CONSTRAINT "CalendarEvent_authorId_fkey";

-- DropForeignKey
ALTER TABLE "public"."WeeklyFocus" DROP CONSTRAINT "WeeklyFocus_authorId_fkey";

-- DropTable
DROP TABLE "public"."CalendarEvent";

-- DropTable
DROP TABLE "public"."WeeklyFocus";
