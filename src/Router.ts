import { route, type Route, Handler } from "@std/http/unstable-route";
import { serveDir, serveFile } from "@std/http/file-server";

type Middleware<T> = (
  state: T,
  req: Request
) => Partial<T> | Promise<Partial<T>>;

export class Router<
  GlobalStateType = Record<string, any>,
  RequestStateType = Record<string, any>
> {
  private routes: Route[] = [];
  private globalMiddlewares: Middleware<GlobalStateType>[] = [];

  constructor(
    private globalState: GlobalStateType = {} as GlobalStateType,
    private requestState: RequestStateType = {} as RequestStateType
  ) {}

  private setGlobalState(state: Partial<GlobalStateType>) {
    this.globalState = {
      ...this.globalState,
      ...state,
    };
  }

  private async executeRouteMiddleware(
    middleware: Middleware<RequestStateType>,
    req: Request
  ) {
    if (!req.payload) {
      req.payload = this.requestState;
    }
    const currentPayload = req.payload as RequestStateType;
    const newPayload = await middleware(currentPayload, req);
    req.payload = {
      ...currentPayload,
      ...newPayload,
    };
  }

  public getGlobalState() {
    return this.globalState;
  }

  public getRequestPayload(req: Request) {
    return req.payload as RequestStateType;
  }

  useGlobalMiddleware(
    cb: (
      state: GlobalStateType,
      req: Request
    ) => Partial<GlobalStateType> | Promise<Partial<GlobalStateType>>
  ) {
    this.globalMiddlewares.push(cb);
  }

  get(path: string, handler: Handler) {
    this.addRoute("GET", path, handler);
  }

  post(path: string, handler: Handler) {
    this.addRoute("POST", path, handler);
  }

  put(path: string, handler: Handler) {
    this.addRoute("PUT", path, handler);
  }

  delete(path: string, handler: Handler) {
    this.addRoute("DELETE", path, handler);
  }

  produceGlobalMiddleware(cb: Middleware<GlobalStateType>) {
    return cb;
  }

  produceLocalMiddleware(cb: Middleware<RequestStateType>) {
    return cb;
  }

  getWithGlobalMiddleware(
    path: string,
    middlewares: Middleware<GlobalStateType>[],
    handler: Handler
  ) {
    this.addRoute("GET", path, handler, middlewares, "global");
  }

  postWithGlobalMiddleware(
    path: string,
    middlewares: Middleware<GlobalStateType>[],
    handler: Handler
  ) {
    this.addRoute("POST", path, handler, middlewares, "global");
  }

  putWithGlobalMiddleware(
    path: string,
    middlewares: Middleware<GlobalStateType>[],
    handler: Handler
  ) {
    this.addRoute("PUT", path, handler, middlewares, "global");
  }

  deleteWithGlobalMiddleware(
    path: string,
    middlewares: Middleware<GlobalStateType>[],
    handler: Handler
  ) {
    this.addRoute("DELETE", path, handler, middlewares, "global");
  }

  getWithLocalMiddleware(
    path: string,
    middlewares: Middleware<RequestStateType>[],
    handler: Handler
  ) {
    this.addRoute("GET", path, handler, middlewares, "local");
  }

  postWithLocalMiddleware(
    path: string,
    middlewares: Middleware<RequestStateType>[],
    handler: Handler
  ) {
    this.addRoute("POST", path, handler, middlewares, "local");
  }

  putWithLocalMiddleware(
    path: string,
    middlewares: Middleware<RequestStateType>[],
    handler: Handler
  ) {
    this.addRoute("PUT", path, handler, middlewares, "local");
  }

  deleteWithLocalMiddleware(
    path: string,
    middlewares: Middleware<RequestStateType>[],
    handler: Handler
  ) {
    this.addRoute("DELETE", path, handler, middlewares, "local");
  }

  redirect(path: string): Response {
    return new Response(null, {
      status: 302,
      headers: {
        Location: path,
      },
    });
  }

  json(data: Record<string, any>, status = 200) {
    return new Response(JSON.stringify(data), {
      headers: {
        "content-type": "application/json",
      },
      status,
    });
  }

  renderHTML(html: string, status = 200) {
    return new Response(html, {
      headers: {
        "content-type": "text/html",
      },
      status,
    });
  }

  text(data: string, status = 200) {
    return new Response(data, {
      headers: {
        "content-type": "text/plain",
      },
      status,
    });
  }

  serveStatic(path: string) {
    let newPath = path;
    if (!path.endsWith("/*")) {
      newPath = path.endsWith("/") ? `${path}*` : `${path}/*`;
    }
    this.addRoute("GET", newPath, (req) => serveDir(req));
  }

  serveFile(path: string, filepath: string) {
    this.addRoute("GET", path, (req) => serveFile(req, filepath));
  }

  private addRoute(
    method: string,
    path: string,
    handler: Handler,
    middlewares:
      | Middleware<GlobalStateType>[]
      | Middleware<RequestStateType>[] = [],
    middlewareType: "global" | "local" = "global"
  ) {
    const pattern = new URLPattern({ pathname: path });
    this.routes.push({
      pattern,
      method,
      handler: async (req, info, params) => {
        try {
          // 1. run global middleware
          for await (const middleware of this.globalMiddlewares) {
            this.setGlobalState(await middleware(this.globalState, req));
          }
          // 2. run route local middleware (that affects global state)
          if (middlewareType === "global") {
            for await (const middleware of middlewares as Middleware<GlobalStateType>[]) {
              this.setGlobalState(await middleware(this.globalState, req));
            }
          } else {
            for await (const middleware of middlewares as Middleware<RequestStateType>[]) {
              // each time this is called, modifies req.payload
              await this.executeRouteMiddleware(middleware, req);
            }
          }
          // 3. run response handler, which ends cycle
          return await handler(req, info!, params!);
        } catch (error) {
          console.error("Error handling request:", error);
          return new Response("Internal Server Error", { status: 500 });
        }
      },
    });
  }

  get handler() {
    return route(this.routes, () => new Response("Not Found", { status: 404 }));
  }

  initServer() {
    Deno.serve(this.handler);
  }
}
