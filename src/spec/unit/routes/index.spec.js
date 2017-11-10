const setupRoutes = require('../../../lib/routes/');


describe('Route component', function () {
  let routeApp;
  let expressApp;

  beforeEach(function () {
    expressApp = { use: stub(), get: stub(), route: stub().returnsThis() };
    routeApp = setupRoutes(expressApp);
  });

  it('can be initialized', function () {
    expect(routeApp).to.equal(expressApp);
  });

  it('attaches "/ping" and "/health" checking routes', function () {
    expect(expressApp.get).to.have.been.calledWith('/ping', match.func);
    expect(expressApp.get).to.have.been.calledWith('/health', match.func);
  });

  it('attaches core routes', function () {
    expect(expressApp.use).to.have.been.calledWith('/api/v1', match.func);
  });

  it('will handle the case when any API endpoint is not found', function () {
    expect(expressApp.route).to.have.been.calledWith('/:url(api)/*');
  });
});
