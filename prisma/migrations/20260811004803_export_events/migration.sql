-- CreateTable
CREATE TABLE "export_events" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kind" TEXT NOT NULL,
    "project_id" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "export_events_kind_idx" ON "export_events"("kind");

-- CreateIndex
CREATE INDEX "export_events_project_id_idx" ON "export_events"("project_id");
