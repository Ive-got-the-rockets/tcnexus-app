(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.TCNexusNavigationGuard = factory();
  }
})(typeof window !== 'undefined' ? window : globalThis, function () {
  function isInternalBuilderNavigation(nextHref, currentHref) {
    var next = new URL(nextHref, currentHref);
    var current = new URL(currentHref);
    return next.origin === current.origin &&
      next.pathname === current.pathname &&
      next.searchParams.get('page') === current.searchParams.get('page') &&
      /^tcnexus-(?:course|show)-builder$/.test(next.searchParams.get('page') || '');
  }

  return { isInternalBuilderNavigation: isInternalBuilderNavigation };
});
