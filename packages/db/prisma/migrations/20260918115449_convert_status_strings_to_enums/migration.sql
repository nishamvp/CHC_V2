/*
  Warnings:

  - Changed the type of `position` on the `department_memberships` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `scope` on the `user_roles` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "CreatedVia" AS ENUM ('WALKIN', 'CALL', 'APP');

-- CreateEnum
CREATE TYPE "MembershipPosition" AS ENUM ('HOS', 'STAFF');

-- CreateEnum
CREATE TYPE "RoleScope" AS ENUM ('GLOBAL', 'UNIT', 'DEPARTMENT');

-- AlterTable
ALTER TABLE "department_memberships" ALTER COLUMN "position" TYPE "MembershipPosition" USING ("position"::"MembershipPosition");

-- AlterTable
ALTER TABLE "user_roles" ALTER COLUMN "scope" TYPE "RoleScope" USING ("scope"::"RoleScope");

-- CreateTable
CREATE TABLE "customers" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameAr" TEXT,
    "region" TEXT,
    "placeNumber" TEXT,
    "emiratesId" TEXT,
    "email" TEXT,
    "createdVia" "CreatedVia" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "customers_organizationId_phone_key" ON "customers"("organizationId", "phone");

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
