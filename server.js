const http = require("http");
const Koa = require("koa");
const cors = require("koa-cors");
const { faker } = require("@faker-js/faker");
const Router = require("@koa/router");

const app = new Koa();
const router = new Router();

const latestPosts = {
  status: "ok",
  data: [],
};

const latestComments = {
  status: "ok",
  data: [],
};

const commentCounts = new Map();

const createPostData = (count) => {
  for (let i = 1; i <= count; i++) {
    const postId = faker.string.uuid();
    latestPosts.data.push({
      id: postId,
      author_id: faker.string.uuid(),
      title: faker.book.title(),
      author: faker.person.fullName(),
      avatar: faker.image.avatar(),
      image: faker.image.urlLoremFlickr({ width: 640, height: 480 }),
      created: faker.date.recent({ days: 10 }).getTime(),
    });

    commentCounts.set(postId, 0);
  }
};

const createLatestComments = (debounce) => {
  const intervalId = setInterval(() => {
    const availablePosts = latestPosts.data.filter(
      (post) => commentCounts.get(post.id) < 3
    );

    if (availablePosts.length === 0) {
      console.log("All posts have 3 comments");
      clearInterval(intervalId);
      return;
    }

    const randomPost =
      availablePosts[Math.floor(Math.random() * availablePosts.length)];

    latestComments.data.push({
      id: faker.string.uuid(),
      post_id: randomPost.id,
      author_id: faker.string.uuid(),
      author: faker.person.fullName(),
      avatar: faker.image.avatar(),
      content: faker.lorem.paragraph({ min: 1, max: 3 }),
      created: faker.date.recent({ days: 10 }).getTime(),
    });

    commentCounts.set(randomPost.id, commentCounts.get(randomPost.id) + 1);
  }, debounce);
};

createPostData(5);
createLatestComments(0);

app.use(
  cors({
    origin: "*",
    credentials: true,
    allowMethods: ["GET", "POST", "PUT", "DELETE"],
  })
);

router.get("/posts/latest", (ctx) => {
  ctx.response.body = latestPosts;
  ctx.response.status = 200;
});

router.get("/posts/:post_id/comments/latest", (ctx) => {
  const { post_id } = ctx.params;

  const postExists = latestPosts.data.find((post) => post.id === post_id);
  if (!postExists) {
    ctx.status = 404;
    ctx.body = { error: "Post not found" };
    return;
  }

  const commentsForPost = latestComments.data
    .filter((comment) => comment.post_id === post_id)
    .sort((a, b) => b.created - a.created)
    .slice(0, 3);

  ctx.body = {
    status: "ok",
    data: commentsForPost,
  };
});

app.use(router.routes()).use(router.allowedMethods());

const port = process.env.PORT || 9000;
const server = http.createServer(app.callback()).listen(port);
