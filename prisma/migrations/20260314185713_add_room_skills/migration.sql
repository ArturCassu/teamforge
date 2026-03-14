-- CreateTable
CREATE TABLE "RoomSkill" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "roomId" TEXT NOT NULL,

    CONSTRAINT "RoomSkill_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RoomSkill_roomId_idx" ON "RoomSkill"("roomId");

-- CreateIndex
CREATE UNIQUE INDEX "RoomSkill_roomId_name_key" ON "RoomSkill"("roomId", "name");

-- AddForeignKey
ALTER TABLE "RoomSkill" ADD CONSTRAINT "RoomSkill_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;
