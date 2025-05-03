CREATE SCHEMA "yt4kids";
--> statement-breakpoint
CREATE TABLE "yt4kids"."author" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"url" varchar(4096) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "yt4kids"."authors_to_thumbnail" (
	"authorId" varchar(255) NOT NULL,
	"thumbnailId" varchar(255) NOT NULL,
	CONSTRAINT "authors_to_thumbnail_authorId_thumbnailId_pk" PRIMARY KEY("authorId","thumbnailId")
);
--> statement-breakpoint
CREATE TABLE "yt4kids"."password" (
	"id" integer PRIMARY KEY NOT NULL,
	"pwHash" varchar(255) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "yt4kids"."profile" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "yt4kids"."profile_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"displayName" varchar(255) NOT NULL,
	"email" varchar(100) NOT NULL,
	"admin" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "yt4kids"."queue" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"authorId" varchar(255) NOT NULL,
	"title" varchar(255) NOT NULL,
	"complete" boolean DEFAULT false NOT NULL,
	"requestedDate" timestamp DEFAULT now() NOT NULL,
	"attempts" smallint DEFAULT 0 NOT NULL,
	"skip" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "yt4kids"."thumbnail" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"url" varchar(255),
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"size" varchar(6) NOT NULL,
	"fileExtention" varchar(4) NOT NULL,
	"filename" text NOT NULL,
	"authorId" varchar(255) NOT NULL,
	"contentLength" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "yt4kids"."video" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"title" varchar(1000),
	"authorId" varchar(255) NOT NULL,
	"durationText" varchar(400) NOT NULL,
	"durationSeconds" integer NOT NULL,
	"quality" varchar(10),
	"format" varchar(40),
	"fileExtention" varchar(4),
	"filename" text,
	"contentLength" bigint
);
--> statement-breakpoint
CREATE TABLE "yt4kids"."videos_to_thumbnail" (
	"videoId" varchar(255) NOT NULL,
	"thumbnailId" varchar(255) NOT NULL,
	CONSTRAINT "videos_to_thumbnail_videoId_thumbnailId_pk" PRIMARY KEY("videoId","thumbnailId")
);
--> statement-breakpoint
ALTER TABLE "yt4kids"."authors_to_thumbnail" ADD CONSTRAINT "authors_to_thumbnail_authorId_author_id_fk" FOREIGN KEY ("authorId") REFERENCES "yt4kids"."author"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "yt4kids"."authors_to_thumbnail" ADD CONSTRAINT "authors_to_thumbnail_thumbnailId_thumbnail_id_fk" FOREIGN KEY ("thumbnailId") REFERENCES "yt4kids"."thumbnail"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "yt4kids"."password" ADD CONSTRAINT "password_id_profile_id_fk" FOREIGN KEY ("id") REFERENCES "yt4kids"."profile"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "yt4kids"."thumbnail" ADD CONSTRAINT "thumbnail_authorId_author_id_fk" FOREIGN KEY ("authorId") REFERENCES "yt4kids"."author"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "yt4kids"."video" ADD CONSTRAINT "video_authorId_author_id_fk" FOREIGN KEY ("authorId") REFERENCES "yt4kids"."author"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "yt4kids"."videos_to_thumbnail" ADD CONSTRAINT "videos_to_thumbnail_videoId_video_id_fk" FOREIGN KEY ("videoId") REFERENCES "yt4kids"."video"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "yt4kids"."videos_to_thumbnail" ADD CONSTRAINT "videos_to_thumbnail_thumbnailId_thumbnail_id_fk" FOREIGN KEY ("thumbnailId") REFERENCES "yt4kids"."thumbnail"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "titleSearch" ON "yt4kids"."video" USING btree (lower("title"));