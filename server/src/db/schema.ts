import { relations, sql, SQL, Table } from "drizzle-orm";
import { AnyPgColumn, bigint, boolean, integer, pgSchema, primaryKey, smallint, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-typebox";

export const dbSchema = pgSchema('yt4kids');

export const ProfileTable = dbSchema.table("profile", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  displayName: varchar({length: 255}).notNull(),
  email: varchar({length: 100}).notNull(),
  admin: boolean().notNull().default(false),
  createdAt: timestamp().notNull().defaultNow(),
});

export const profileSchema = createSelectSchema(ProfileTable);
export const profileInsertSchema = createInsertSchema(ProfileTable);
export type Profile = typeof profileSchema.static;
export type ProfileInsert = typeof profileInsertSchema.static;

export const PasswordTable = dbSchema.table("password", {
  id: integer().primaryKey().notNull().references(() => ProfileTable.id),
  pwHash: varchar({length: 255}).notNull()
});

export const passwordSchema = createSelectSchema(PasswordTable);
export const passwordInsertSchema = createInsertSchema(PasswordTable);
export type Password = typeof passwordSchema.static;
export type PasswordInsert = typeof passwordInsertSchema.static;

// export const FileTable = dbSchema.table("file", {
//   id: varchar({length: 255}).primaryKey().notNull(),
//   fileExtention: varchar({length: 4}).notNull(),
//   filename: text().notNull(),
//   authorID: varchar({length: 255}).notNull().references(() => AuthorTable.id),
//   contentLength: integer().notNull()
// });

// export const fileSchema = createSelectSchema(FileTable);
// export const fileInsertSchema = createInsertSchema(FileTable);
// export type File = typeof fileSchema.static;
// export type FileInsert = typeof fileInsertSchema.static;

export const AuthorTable = dbSchema.table("author", {
  id: varchar({length: 255}).primaryKey().notNull(),
  name: varchar({length: 255}).notNull(),
  url: varchar({length: 4096}).notNull(),
});

export const authorSchema = createSelectSchema(AuthorTable);
export const authorInsertSchema = createInsertSchema(AuthorTable);

export type Author = typeof authorSchema.static;
export type AuthorInsert = typeof authorInsertSchema.static;

export const ThumbnailTable = dbSchema.table("thumbnail", {
  id: varchar({length: 255}).primaryKey().notNull(),
  url: varchar({length: 255}),
  width: integer().notNull(),
  height: integer().notNull(),
  // fileId: varchar({length: 255}).references(() => FileTable.id),
  size: varchar({ length: 6}).notNull(),
  // just embed the file info in here
  fileExtention: varchar({length: 4}).notNull(),
  filename: text().notNull(),
  authorId: varchar({length: 255}).notNull().references(() => AuthorTable.id),
  contentLength: bigint({mode: 'number'}).notNull()
});

export const thumbnailSchema = createSelectSchema(ThumbnailTable);
export const thumbnailInsertSchema = createInsertSchema(ThumbnailTable);
export type Thumbnail = typeof thumbnailSchema.static;
export type ThumbnailInsert = typeof thumbnailInsertSchema.static;

export const VideoTable = dbSchema.table("video", {
  id: varchar({length: 255}).notNull().primaryKey(),
  title: varchar({length: 1000}),
  authorId: varchar({length: 255}).notNull().references(() => AuthorTable.id),
  durationText: varchar({length: 400}).notNull(),
  durationSeconds: integer().notNull(),
  // fileId: varchar({length: 255}).notNull().references(() => FileTable.id),
  quality: varchar({length: 10}),
  format: varchar({length: 40}),
  fileExtention: varchar({length: 4}),
  filename: text(),
  contentLength: bigint({mode: 'number'})
},
(table) => [
  // an index that will search everything in lowercase
  uniqueIndex('titleSearch').on(lower(table.title)),
]
);

// custom lower function
export function lower(email: AnyPgColumn): SQL {
  return sql`lower(${email})`;
}

export const videoSchema = createSelectSchema(VideoTable);
export const videoInsertSchema = createInsertSchema(VideoTable);
export type Video = typeof videoSchema.static;
export type VideoInsert = typeof videoInsertSchema.static;

export const QueueTable = dbSchema.table("queue", {
  // video id, but we cant reference as it doesnt exist yet
  id: varchar({length: 255}).primaryKey().notNull(),
  // same reason, cannot reference author table as it doesnt exist yet
  authorId: varchar({length: 255}).notNull(),
  title: varchar({length: 255}).notNull(),
  complete: boolean().notNull().default(false),
  requestedDate: timestamp().notNull().defaultNow(),
  attempts: smallint().notNull().default(0),
  skip: boolean().notNull().default(false),
});

export const queueSchema = createSelectSchema(QueueTable);
export const queueInsertSchema = createInsertSchema(QueueTable);
export type Queue = typeof queueSchema.static;
export type QueueInsert = typeof queueInsertSchema.static;


// ? dont think this is used yet
// export const ChannelTable = dbSchema.table("channel", {
//   id: varchar({length: 255}).notNull().primaryKey(),
//   name: varchar({length: 255}).notNull(),
//   authorId: varchar({length: 255}).notNull().references(() => AuthorTable.id),
//   videoId: varchar({length: 255}).notNull().references(() => VideoTable.id),
//   stayUpdated: boolean().notNull().default(false),
// });

// export const channelSchema = createSelectSchema(ChannelTable);
// export const channelInsertSchema = createInsertSchema(ChannelTable);
// export type Channel = typeof channelSchema.static;
// export type ChannelInsert = typeof channelInsertSchema.static;

// * MANY TO MANY TABLES
// mostly anything that touches thumbnails has a many-to-many relationship
// since we usually have a few thumbnails for every thing

export const AuthorsToThumbnailsTable = dbSchema.table("authors_to_thumbnail", {
  authorId: varchar({length: 255}).notNull().references(() => AuthorTable.id),
  thumbnailId: varchar({length: 255}).notNull().references(() => ThumbnailTable.id),
},
(t) => [
  primaryKey({ columns: [t.authorId, t.thumbnailId]}),
]);

export const AuthorsToThumbnailsSchema = createSelectSchema(AuthorsToThumbnailsTable);
export const AuthorsToThumbnailsInsertSchema = createInsertSchema(AuthorsToThumbnailsTable);

export type AuthorsToThumbnails = typeof AuthorsToThumbnailsSchema.static;
export type AuthorsToThumbnailsInsert = typeof AuthorsToThumbnailsInsertSchema.static;

// broke the relationship because we store thumbnails for search queries
// that we dont have videos for, but we still need to look them up
export const VideosToThumbnailsTable = dbSchema.table("videos_to_thumbnail", {
  videoId: varchar({length: 255}).notNull().references(() => VideoTable.id),
  thumbnailId: varchar({length: 255}).notNull().references(() => ThumbnailTable.id),
},
(t) => [
  primaryKey({ columns: [t.videoId, t.thumbnailId]}),
]);

export const VideosToThumbnailSchema = createSelectSchema(VideosToThumbnailsTable);
export const VideosToThumbnailInsertSchema = createInsertSchema(VideosToThumbnailsTable);
export type VideosToThumbnails = typeof VideosToThumbnailSchema.static;
export type VideosToThumbnailInsert = typeof VideosToThumbnailInsertSchema.static;


// * RELATIONS DEFINITIONS
// we do this at the end so everything needed is defined already

export const AuthorRelations = relations(AuthorTable, ({many}) => ({
  AuthorsToThumbnails: many(AuthorsToThumbnailsTable),
  AuthorsToVideos : many(VideoTable),
  // AuthorsToChannels: many(ChannelTable),
}));

// export const ChannelRelations = relations(ChannelTable, ({many, one}) =>  ({
//   ChannelToAuthor: one(AuthorTable),
//   ChannelToVideos: many(VideoTable),
// }));

export const ThumbnailRelations = relations(ThumbnailTable, ({many, one}) => ( {
  // ThumbnailsToAuthors: many(AuthorsToThumbnailsTable),
  ThumbnailToAuthor : one(AuthorTable, {fields: [ThumbnailTable.authorId], references: [AuthorTable.id]}),
  ThumbnailsToVideos : many(VideosToThumbnailsTable),
  // ThumbnailToFile: one(FileTable),
}));

export const VideoRelations = relations(VideoTable, ({many, one}) => ({
  VideosToThumbnails : many(VideosToThumbnailsTable),
  AuthorsToVideos : one(AuthorTable),
  // VideoToFile: one(FileTable, { fields: [VideoTable.fileId], references: [FileTable.id]}),
}));

// export const FileRelations = relations(FileTable, ({ one }) => ({
//   Author: one(AuthorTable),
//   Video: one(VideoTable),
// }));