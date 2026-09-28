-- Full-text search index backing GET /posts?q=.
-- The expression must stay identical to SEARCH_VECTOR in posts.service.ts.
CREATE INDEX "Post_search_idx" ON "Post"
  USING GIN (to_tsvector('english', "title" || ' ' || "excerpt" || ' ' || "contentMd"));
