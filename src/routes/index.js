const { Hono } = require('hono');
const { html } = require('hono/html');
const layout = require('../layout');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({ log: ['query'] });

const app = new Hono();

app.get('/', async (c) => {
  const recipes = await prisma.recipe.findMany({
    orderBy: {
      updatedAt: 'desc',
    },
  });

  return c.html(
    layout(
      c,
      null,
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
            padding: 5px 12px;
            border: 1px solid #ccc;
            border-radius: 5px;
            text-decoration: none;
            color: black;
            background-color: #f5f5f5;
          }
        </style>

        <div class="my-3">
          <div class="p-5 bg-light rounded-3">
            <h1 class="text-body">レシピ一覧</h1>
            <p class="lead">
              ここでは、レシピを登録するサービスです。
            </p>
          </div>
        </div>

        <p>
          <a href="/recipes/new">＋ 新しいレシピを登録する</a>
        </p>

        ${recipes.map(
          (recipe) => html`
            <div class="recipe">
              <h2>${recipe.name}</h2>
              <p>ジャンル：${recipe.genre}</p>
              <p>${recipe.description}</p>

              <a
                class="edit-button"
                href="/recipes/${recipe.recipeId}/edit"
              >
                編集
              </a>
            </div>
          `,
        )}
      `,
    ),
  );
});

module.exports = app;