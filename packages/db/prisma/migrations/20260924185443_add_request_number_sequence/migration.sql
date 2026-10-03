-- CreateTable
CREATE TABLE "request_number_sequences" (
    "organizationId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "lastNumber" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "request_number_sequences_pkey" PRIMARY KEY ("organizationId","year")
);

-- AddForeignKey
ALTER TABLE "request_number_sequences" ADD CONSTRAINT "request_number_sequences_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
