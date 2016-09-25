// @flow
import { renderToString } from 'react-dom/server';
import { match } from 'react-router';
import { DefaultNetworkLayer } from 'react-relay';
import IsomorphicRouter from 'isomorphic-relay-router';
import routes from 'app/routes.jsx';

const networkLayer = new DefaultNetworkLayer(
  // $FlowFixMe
  `http://localhost:${process.env.PORT}/graphql`
);

export default async (ctx: Object, next: Function) => {
  if (process.env.SERVER_RENDERING) {
    ctx.prerender = (template: string, parameters: Object = {}) =>
      new Promise((resolve, reject) => {
        match({ routes, location: ctx.req.url }, (error, redirectLocation, renderProps) => {
          if (error) {
            ctx.throw(500, error.message);
          } else if (redirectLocation) {
            ctx.redirect(redirectLocation.pathname + redirectLocation.search);
          } else if (renderProps) {
            IsomorphicRouter.prepareData(renderProps, networkLayer)
              .then(({ data: prerenderData, props }) => {
                const prerenderComponent = renderToString(IsomorphicRouter.render(props));

                ctx.render(template, {
                  ...parameters,
                  prerenderComponent,
                  prerenderData,
                }).then(resolve).catch(reject);
              });
          } else {
            ctx.throw(404);
          }
        });
      });
    await next();
  } else {
    ctx.prerender = ctx.render;
    await next();
  }
};
