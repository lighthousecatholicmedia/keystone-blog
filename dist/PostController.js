'use strict';

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _KeystoneHelper = require('./Keystone/KeystoneHelper');

var _KeystoneHelper2 = _interopRequireDefault(_KeystoneHelper);

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

var _Binder2 = require('./Binder');

var _Binder3 = _interopRequireDefault(_Binder2);

var _Renderer = require('./Renderer');

var _Renderer2 = _interopRequireDefault(_Renderer);

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

/**
 * Controller for the BlogPost object
 */

var PostController = (function (_Binder) {
  _inherits(PostController, _Binder);

  /**
   * Constructor for the PostController object
   * @param  {Boolean} render Whether the keystone-blog module should render jade templates.
   *                          If true, a rendered template is returned.
   *                          If false, index methods will return a list of Post instances and
   *                          show methods will return Post instances.
   * @param  {Integer} perPage The number of blog posts to show on a single index page. Defaults to 10.
   * @param  {Integer} maxPages The number of pages to show in the pagination navigation. Defaults to 5.
   * @param  {String} dateFormat The format to show the blog date. Defaults to "llll". See http://momentjs.com/#format-dates
   */

  function PostController(render, perPage, maxPages, dateFormat) {
    _classCallCheck(this, PostController);

    var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(PostController).call(this));

    _this.render = render || true;
    _this.perPage = perPage || 10;
    _this.maxPages = maxPages || 5;
    _this.dateFormat = dateFormat || "llll";
    _this._bind(['request', '_index', '_show', '_renderIndex', '_renderShow']);
    return _this;
  }

  /**
   * A request is made. This is called as a middleware function in the parent application's routes.
   * If a post slug is attached to the request parameters, the show function will be called next,
   * otherwise the index function will.
   * @param  {HttpRequest}   req
   * @param  {HttpResponse}  res
   * @param  {Function}      next
   */

  _createClass(PostController, [{
    key: 'request',
    value: function request(req, res, next) {
      if (req.params.post) {
        this._show(req, res, next);
      } else {
        this._index(req, res, next);
      }
    }

    // TODO Sort similarly to reddit's hot sort algorithm so createdAt date is factored into the sorting
    /**
     * Get a list of most popular posts
     * @param  {HttpRequest}  req  [description]
     * @param  {HttpResponse} res  [description]
     * @return {List[Post]}   The posts, sorted by popularity
     */

  }, {
    key: 'popularPosts',
    value: function popularPosts(req, res, limit) {
      var render = this.render;
      var session = req.session;
      var query = _KeystoneHelper2.default.getKeystone().list('BlogPost').model.find().populate('tags').sort('-views');
      if (typeof limit !== 'undefined') {
        query.limit(limit);
      }
      return query.exec(function (err, result) {});
    }
  }, {
    key: 'popularIndex',
    value: function popularIndex(req, res, next) {}

    /**
     * Get the index of posts. If render is true, a rendered jade template will be returned.
     * Else, a list of Posts will be.
     * @param  {HttpRequest}   req
     * @param  {HttpResponse}  res
     * @param  {Function}      next
     * @return {JadeTemplate or List[Post]} The configured return format for an index of posts
     */

  }, {
    key: '_index',
    value: function _index(req, res, next) {
      var _this2 = this;

      var render = this.render;
      var page = req.query.page || 1;
      var perPage = this.perPage;
      var maxPages = this.maxPages;

      // If we are not filtering on tag
      var promise = _bluebird2.default.resolve(false);
      // If we are filtering on tag
      if (req.query.tag) {
        var tag;
        var tagFilter = req.query.tag;
        promise = _KeystoneHelper2.default.getKeystone().list('Tag').model.findOne({ 'slug': tagFilter }).exec(function (err, result) {
          tag = result;
        });
      }
      promise.then(function (result) {
        var execAsync;
        // If we are not filtering on tag
        if (result === false) {
          execAsync = _bluebird2.default.promisify(_KeystoneHelper2.default.getKeystone().list('BlogPost').paginate({
            page: page,
            perPage: perPage,
            maxPages: maxPages
          }).sort('-createdAt').populate('tags').exec);
        } else {
          // If we are filtering on tag
          execAsync = _bluebird2.default.promisify(_KeystoneHelper2.default.getKeystone().list('BlogPost').paginate({
            page: page,
            perPage: perPage
          }).sort('-createdAt').populate('tags').where('tags').in([result]).exec);
        }
        return execAsync;
      }).then(function (result) {
        result().then(function (posts) {
          // Render a jade template and return it
          if (render) {
            req.renderedTemplate = _this2._renderIndex(posts);
          } else {
            // Return the result set of posts
            req.posts = posts;
          }
          // Allow the next in the chain
          next();
        });
      });
    }

    /**
     * Get a posts. If render is true, a rendered jade template will be returned.
     * Else, a Post instance will be.
     * @param  {HttpRequest}   req
     * @param  {HttpResponse}  res
     * @param  {Function}      next
     * @return {JadeTemplate or Post} The configured return format for a post
     */

  }, {
    key: '_show',
    value: function _show(req, res, next) {
      var _this3 = this;

      var render = this.render;
      var session = req.session;
      if (typeof session.postViews == 'undefined') {
        session.postViews = [];
      }
      _bluebird2.default.resolve(_KeystoneHelper2.default.getKeystone().list('BlogPost').model.findOne({ 'slug': req.params.post }).populate('tags').exec()).then(function (post) {
        // Track pageviews of this blog post if the session has not already done so
        if (session.postViews.indexOf(post.slug) == -1) {
          _KeystoneHelper2.default.getKeystone().list('BlogPost').model.update({ slug: post.slug }, {
            views: post.views + 1
          }, function (err, affected, resp) {});
          session.postViews.push(post.slug);
        }

        if (render) {
          req.renderedTemplate = _this3._renderShow(post);
        } else {
          req.post = post;
        }
        next();
      });
    }

    /**
     * Render the jade template for post index
     * @param  {List[Post]} posts The post index
     * @return {Rendered jade tmeplate} The index partial
     */

  }, {
    key: '_renderIndex',
    value: function _renderIndex(posts) {
      var dateFormat = this.dateFormat;
      var renderer = new _Renderer2.default();
      return renderer.render(posts, '/../templates/layouts/index.jade', dateFormat);
    }

    /**
     * Render the jade template for post show
     * @param  {List[Post]} posts The post
     * @return {Rendered jade tmeplate} The show partial
     */

  }, {
    key: '_renderShow',
    value: function _renderShow(post) {
      var dateFormat = this.dateFormat;
      var renderer = new _Renderer2.default();
      return renderer.render(post, '/../templates/layouts/show.jade', dateFormat);
    }
  }]);

  return PostController;
})(_Binder3.default);

module.exports = PostController;
//# sourceMappingURL=PostController.js.map