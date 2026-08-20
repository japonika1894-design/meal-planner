'use strict';

const { Hono } = require('hono');
const { html } = require('hono/html');
const { PrismaClient } = require('@prisma/client');
const { z } = require('zod');
const { zValidator } = require('@hono/zod-validator');
const { HTTPException } = require('hono/http-exception');

const layout = require('../layout');
const ensureAuthenticated = require('../middlewares/ensure-authenticated');

const prisma = new PrismaClient();

const app = new Hono();

// ログインしているユーザーだけ利用可能
app.use(ensureAuthenticated());


const recipeIdValidator = zValidator(
  'param',
  z.object({
    recipeId: z.string().uuid(),
  }),
  (result) => {
    if (!result.success) {
      throw new HTTPException(400, {
        message: 'URL の形式が正しくありません。',
      });
    }
  },
);

const recipeFormValidator = zValidator(
  'form',
  z.object({
    name: z.string().min(1),
    genre: z.string().min(1),
    description: z.string().min(1),
  }),
  (result) => {
    if (!result.success) {
      throw new HTTPException(400, {
        message: '入力された情報が不十分または正しくありません。',
      });
    }
  },
);

// レシピ一覧
app.get('/', async (c) => {
  const recipes = await prisma.recipe.findMany({
    orderBy: {
      createdAt: 'desc',
    },
  });

  return c.html(
    layout(
      c,
      'レシピ一覧',
      html`
        <style>
          .recipe {
            border: 1px solid #ccc;
            padding: 15px;
            margin: 15px 0;
            width: 400px;
            border-radius: 8px;
          }

          .recipe h2 {
            margin-top: 0;
          }

          .edit-button {
            display: inline-block;
            margin-top: 10px;
          }
        </style>

        <h1>レシピ一覧</h1>

        <p>
          <a href="/recipes/new">
            ＋ 新しいレシピを登録する
          </a>
        </p>

        ${
          recipes.length === 0
            ? html`
                <p>まだレシピが登録されていません。</p>
              `
            : html`
                ${recipes.map(
                  (recipe) => html`
                    <div class="recipe">
                      <h2>${recipe.name}</h2>

                      <p>
                        ジャンル：${recipe.genre}
                      </p>

                      <p>
                        ${recipe.description}
                      </p>

                      <a
                        class="edit-button"
                        href="/recipes/${recipe.recipeId}/edit"
                      >
                        編集する
                      </a>
                    </div>
                  `,
                )}
              `
        }
      `,
    ),
  );
});


// レシピ登録画面
app.get('/new', (c) => {
  return c.html(
    layout(
      c,
      'レシピの登録',
      html`
        <h1>レシピの登録</h1>

        <form
          class="my-3"
          method="post"
          action="/recipes"
        >
          <div class="mb-3">
            <label class="form-label">
              料理名
            </label>

            <input
              type="text"
              name="name"
              class="form-control"
              required
            />
          </div>

          <div class="mb-3">
            <label class="form-label">
              ジャンル
            </label>

            <input
              type="text"
              name="genre"
              class="form-control"
              placeholder="例：和食、洋食、中華"
              required
            />
          </div>

          <div class="mb-3">
            <label class="form-label">
              料理の説明
            </label>

            <textarea
              name="description"
              class="form-control"
              required
            ></textarea>
          </div>

          <button
            type="submit"
            class="btn btn-primary"
          >
            レシピを登録する
          </button>
        </form>
      `,
    ),
  );
});


// レシピをデータベースに保存
app.post(
  '/',
  recipeFormValidator,
  async (c) => {
    const body = c.req.valid('form');

    await prisma.recipe.create({
      data: {
        name: body.name,
        genre: body.genre,
        description: body.description,
      },
    });

    return c.redirect('/recipes');
  },
);


// レシピ編集ページ
app.get(
  '/:recipeId/edit',
  recipeIdValidator,
  async (c) => {
    const { recipeId } = c.req.valid('param');

    const recipe = await prisma.recipe.findUnique({
      where: {
        recipeId: recipeId,
      },
    });

    if (!recipe) {
      return c.notFound();
    }

    return c.html(
      layout(
        c,
        `レシピの編集: ${recipe.name}`,
        html`
          <h1>レシピの編集</h1>

          <form
            class="my-3"
            method="post"
            action="/recipes/${recipe.recipeId}/update"
          >
            <div class="mb-3">
              <label class="form-label">料理名</label>
              <input
                type="text"
                name="name"
                class="form-control"
                value="${recipe.name}"
                required
              />
            </div>

            <div class="mb-3">
              <label class="form-label">ジャンル</label>
              <input
                type="text"
                name="genre"
                class="form-control"
                value="${recipe.genre}"
                required
              />
            </div>

            <div class="mb-3">
              <label class="form-label">料理の説明</label>
              <textarea
                name="description"
                class="form-control"
                required
              >${recipe.description}</textarea>
            </div>

            <button type="submit" class="btn btn-primary">
              この内容でレシピを編集する
            </button>
          </form>

          <h3 class="my-3">危険な変更</h3>

          <form
            method="post"
            action="/recipes/${recipe.recipeId}/delete"
            id="delete-recipe-form"
          >
            <button type="submit" class="btn btn-danger">
              このレシピを削除する
            </button>
          </form>
        `,
      ),
    );
  },
);

// レシピの編集内容を保存
app.post(
  '/:recipeId/update',
  recipeIdValidator,
  recipeFormValidator,
  async (c) => {
    const { recipeId } = c.req.valid('param');
    const body = c.req.valid('form');

    const recipe = await prisma.recipe.findUnique({
      where: {
        recipeId: recipeId,
      },
    });

    if (!recipe) {
      return c.notFound();
    }

    await prisma.recipe.update({
      where: {
        recipeId: recipeId,
      },
      data: {
        name: body.name,
        genre: body.genre,
        description: body.description,
      },
    });

    return c.redirect('/recipes');
  },
);

// レシピを削除
app.post(
  '/:recipeId/delete',
  recipeIdValidator,
  async (c) => {
    const { recipeId } = c.req.valid('param');

    const recipe = await prisma.recipe.findUnique({
      where: {
        recipeId: recipeId,
      },
    });

    if (!recipe) {
      return c.notFound();
    }

    await prisma.recipe.delete({
      where: {
        recipeId: recipeId,
      },
    });

    return c.redirect('/recipes');
  },
);


module.exports = app;
