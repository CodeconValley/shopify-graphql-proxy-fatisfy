import proxy from "fastify-reply-from";
import type { FastifyInstance } from "fastify";
import { ShopifySession, ProxyOptions, ApiVersion, ShopifyIncomingHTTPHeaders } from "./types";

export default async function shopifyGraphQLProxy(fastify: FastifyInstance, proxyOptions: ProxyOptions) {
  const session: ShopifySession = { shop: "", accessToken: "" };

  fastify.addHook("onRequest", (request, _reply, done) => {
    session.shop = request?.session?.shop;
    session.accessToken = request?.session?.accessToken;
    done();
  });

  const shop = "shop" in proxyOptions ? proxyOptions.shop : session.shop;
  const accessToken = "password" in proxyOptions ? proxyOptions.password : session.accessToken;
  const version = proxyOptions.version || ApiVersion.Stable;

  if (accessToken === "" || shop === "") {
    throw new Error("Unauthorized, Shopify `accessToken` or `shop` arguments are empty.");
  }

  await fastify.register(proxy, {
    base: shop,
  });

  fastify.post("/graphql", (_request, reply) => {
    reply.from(`${shop}/admin/api/${version}/graphql.json`, {
      rewriteRequestHeaders(_originalReq, headers) {
        const modifiedHeaders: ShopifyIncomingHTTPHeaders = {
          ...headers,
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": accessToken,
        };

        return modifiedHeaders;
      },
    });
  });
}

export { ApiVersion };
