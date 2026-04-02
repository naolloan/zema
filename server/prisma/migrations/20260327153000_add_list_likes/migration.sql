-- CreateTable
CREATE TABLE "list_likes" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "listId" TEXT NOT NULL,

    CONSTRAINT "list_likes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "list_likes_userId_listId_key" ON "list_likes"("userId", "listId");

-- AddForeignKey
ALTER TABLE "list_likes" ADD CONSTRAINT "list_likes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "list_likes" ADD CONSTRAINT "list_likes_listId_fkey" FOREIGN KEY ("listId") REFERENCES "lists"("id") ON DELETE CASCADE ON UPDATE CASCADE;
