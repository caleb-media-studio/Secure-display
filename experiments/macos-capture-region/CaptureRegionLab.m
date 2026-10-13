// Secure Display native capture-region research lab (macOS only).
// This is NOT an extension or production app. It tests a private function
// used by Chromium to exclude native-window regions from OS capture.
// Never use private API results as a security guarantee without capture tests.
#import <Cocoa/Cocoa.h>
#import <WebKit/WebKit.h>
#import <CoreGraphics/CoreGraphics.h>
#import <dlfcn.h>
#include <stdint.h>

typedef uint32_t SDConnectionID;
typedef NSInteger SDWindowID;
typedef CFTypeRef SDRegionRef;

typedef SDConnectionID (*SDMainConnectionFn)(void);
typedef SDRegionRef (*SDCreateRegionFn)(CGRect);
typedef CGError (*SDExcludeRegionFn)(SDConnectionID, SDWindowID, SDRegionRef);

typedef NS_ENUM(NSInteger, SDProtectionMode) {
  SDProtectionOff = 0,
  SDProtectionLeft,
  SDProtectionRight,
  SDProtectionWhole
};

// Mirrors Chromium's lookup targets without linking against a private SDK.
static void *SDFindSymbol(const char *name) {
  void *symbol = dlsym(RTLD_DEFAULT, name);
  if (symbol) return symbol;
  static void *skylight = NULL;
  static void *applicationServices = NULL;
  if (!skylight) {
    skylight = dlopen("/System/Library/PrivateFrameworks/SkyLight.framework/SkyLight",
                       RTLD_LAZY | RTLD_LOCAL);
  }
  if (!applicationServices) {
    applicationServices = dlopen(
      "/System/Library/Frameworks/ApplicationServices.framework/ApplicationServices",
      RTLD_LAZY | RTLD_LOCAL);
  }
  if (skylight) symbol = dlsym(skylight, name);
  if (!symbol && applicationServices) symbol = dlsym(applicationServices, name);
  return symbol;
}

@interface CaptureRegionLab : NSObject <NSApplicationDelegate, NSWindowDelegate>
@property (nonatomic, strong) NSWindow *window;
@property (nonatomic, strong) NSWindow *blackBacking;
@property (nonatomic, strong) NSTextField *status;
@property (nonatomic, assign) SDProtectionMode protectionMode;
@property (nonatomic, assign) SDMainConnectionFn getConnection;
@property (nonatomic, assign) SDCreateRegionFn createRegion;
@property (nonatomic, assign) SDExcludeRegionFn excludeRegion;
- (void)setProtection:(SDProtectionMode)mode;
@end

@implementation CaptureRegionLab

- (NSButton *)addControl:(NSString *)title
                     x:(CGFloat)x
                parent:(NSView *)bar
                action:(SEL)action {
  NSButton *button = [NSButton buttonWithTitle:title target:self action:action];
  button.frame = NSMakeRect(x, 40, 116, 30);
  button.bezelStyle = NSBezelStyleRounded;
  [bar addSubview:button];
  return button;
}

- (void)applicationDidFinishLaunching:(NSNotification *)notification {
  (void)notification;
  self.getConnection = (SDMainConnectionFn)SDFindSymbol("CGSMainConnectionID");
  self.createRegion = (SDCreateRegionFn)SDFindSymbol("CGRegionCreateWithRect");
  self.excludeRegion = (SDExcludeRegionFn)SDFindSymbol("CGSSetWindowCaptureExcludeShape");

  [NSApp setActivationPolicy:NSApplicationActivationPolicyRegular];
  NSRect frame = NSMakeRect(160, 100, 1120, 650);
  NSUInteger style = NSWindowStyleMaskTitled | NSWindowStyleMaskClosable |
                     NSWindowStyleMaskMiniaturizable | NSWindowStyleMaskResizable;
  self.window = [[NSWindow alloc] initWithContentRect:frame
                                            styleMask:style
                                              backing:NSBackingStoreBuffered
                                                defer:NO];
  self.window.title = @"Secure Display — Native Region Capture Test";
  self.window.minSize = NSMakeSize(920, 480);
  self.window.delegate = self;
  [self.window center];

  // A normal, unprotected BLACK WINDOW behind the real HTML window.
  // If capture omits the foreground's protected region, this background
  // makes the hole black rather than revealing an arbitrary desktop.
  self.blackBacking = [[NSWindow alloc] initWithContentRect:self.window.frame
                                                   styleMask:NSWindowStyleMaskBorderless
                                                     backing:NSBackingStoreBuffered
                                                       defer:NO];
  self.blackBacking.backgroundColor = [NSColor blackColor];
  self.blackBacking.opaque = YES;
  self.blackBacking.hasShadow = NO;
  self.blackBacking.ignoresMouseEvents = YES;
  self.blackBacking.level = NSNormalWindowLevel;

  NSView *body = self.window.contentView;
  NSRect bounds = body.bounds;

  NSView *bar = [[NSView alloc] initWithFrame:NSMakeRect(0, bounds.size.height - 100,
                                                        bounds.size.width, 100)];
  bar.wantsLayer = YES;
  bar.layer.backgroundColor = NSColor.windowBackgroundColor.CGColor;
  bar.autoresizingMask = NSViewWidthSizable | NSViewMinYMargin;
  [body addSubview:bar];

  self.status = [NSTextField labelWithString:@"Starting capture-region experiment..."];
  self.status.frame = NSMakeRect(20, 46, 560, 24);
  self.status.font = [NSFont monospacedSystemFontOfSize:12 weight:NSFontWeightMedium];
  self.status.lineBreakMode = NSLineBreakByTruncatingTail;
  [bar addSubview:self.status];

  NSTextField *info = [NSTextField labelWithString:
    @"Both columns are REAL, clickable HTML. Test a macOS screenshot after changing the region."];
  info.frame = NSMakeRect(20, 11, 1010, 22);
  info.font = [NSFont systemFontOfSize:12];
  [bar addSubview:info];

  // Keep toggles on the right. They stay visible/clickable on the monitor.
  [self addControl:@"Protect LEFT" x:610 parent:bar action:@selector(protectLeft:)];
  [self addControl:@"Protect RIGHT" x:730 parent:bar action:@selector(protectRight:)];
  [self addControl:@"Protect ALL" x:850 parent:bar action:@selector(protectAll:)];
  [self addControl:@"Clear" x:970 parent:bar action:@selector(clearProtection:)];

  WKWebView *web = [[WKWebView alloc] initWithFrame:NSMakeRect(0, 0, bounds.size.width,
                                                              bounds.size.height - 100)];
  web.autoresizingMask = NSViewWidthSizable | NSViewHeightSizable;
  [body addSubview:web];

  NSString *html =
  @"<!doctype html><html><head><meta charset='UTF-8'>"
  "<meta name='viewport' content='width=device-width,initial-scale=1'>"
  "<style>"
  "*{box-sizing:border-box}html,body{margin:0;height:100%;font-family:-apple-system,system-ui,sans-serif;background:#0b1425;color:#f5f9ff}"
  ".columns{display:grid;grid-template-columns:1fr 1fr;height:100%;}"
  "section{padding:54px 30px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center}"
  "#left{background:#173859;border-right:5px solid #040d1a}"
  "#right{background:#17634e}"
  "h2{font-size:31px;margin:12px 0}p{font-size:19px;line-height:1.45}"
  "button{padding:15px 22px;border:0;border-radius:9px;background:#9feacd;color:#10303b;font-weight:750;font-size:17px;cursor:pointer}"
  "#right button{background:#fce38b}"
  ".label{letter-spacing:.12em;font-size:12px;font-weight:750}"
  ".count{font-size:20px;margin:16px;color:#fff}"
  "</style></head><body><div class='columns'>"
  "<section id='left'><div class='label'>LEFT — CAPTURE EXCLUSION CANDIDATE</div>"
  "<h2>Protected section?</h2>"
  "<p>This page is protected by Security Display GitHub repo, and this is a test.</p>"
  "<button onclick=\"document.getElementById('countL').textContent=++window.l\">CLICK LEFT</button>"
  "<span id='countL' class='count'>0</span></section>"
  "<section id='right'><div class='label'>RIGHT — NORMAL HTML CONTROL</div>"
  "<h2>Ordinary section</h2>"
  "<p>This text should stay capturable when only the left region is excluded.</p>"
  "<button onclick=\"document.getElementById('countR').textContent=++window.r\">CLICK RIGHT</button>"
  "<span id='countR' class='count'>0</span></section>"
  "</div><script>window.l=0;window.r=0;</script></body></html>";
  [web loadHTMLString:html baseURL:nil];

  [self.window makeKeyAndOrderFront:nil];
  [self updateBacking];
  [NSApp activateIgnoringOtherApps:YES];

  BOOL symbolsPresent = self.getConnection && self.createRegion && self.excludeRegion;
  self.status.stringValue = symbolsPresent
    ? @"Ready — choose LEFT, RIGHT, ALL, or Clear; then screenshot."
    : @"Private capture API unavailable — inspect Terminal.";
  if (!symbolsPresent) {
    fprintf(stderr, "One or more native CGS symbols are unavailable on this macOS version.\n");
    fprintf(stderr, "CGSMainConnectionID: %s\n", self.getConnection ? "yes" : "NO");
    fprintf(stderr, "CGRegionCreateWithRect: %s\n", self.createRegion ? "yes" : "NO");
    fprintf(stderr, "CGSSetWindowCaptureExcludeShape: %s\n", self.excludeRegion ? "yes" : "NO");
  }
}

- (void)updateBacking {
  if (!self.window || !self.blackBacking) return;
  [self.blackBacking setFrame:self.window.frame display:YES];
  // This is NOT itself protected. Its sole purpose is black pixels under
  // the area that the screenshot compositor may omit from the front window.
  [self.blackBacking orderWindow:NSWindowBelow relativeTo:self.window.windowNumber];
}

- (void)setProtection:(SDProtectionMode)mode {
  self.protectionMode = mode;
  if (!self.getConnection || !self.createRegion || !self.excludeRegion) {
    self.status.stringValue = @"Unavailable: private system API symbol not found";
    return;
  }
  NSRect frame = self.window.frame;
  CGRect local = CGRectMake(0, 0, frame.size.width, frame.size.height);
  if (mode == SDProtectionLeft) {
    local.size.width = floor(frame.size.width / 2.0);
  } else if (mode == SDProtectionRight) {
    local.origin.x = floor(frame.size.width / 2.0);
    local.size.width = frame.size.width - local.origin.x;
  }
  SDRegionRef region = NULL;
  if (mode != SDProtectionOff) {
    region = self.createRegion(local);
    if (!region) {
      self.status.stringValue = @"Failed: could not create native exclusion region";
      return;
    }
  }
  CGError result = self.excludeRegion(self.getConnection(),
                                      (SDWindowID)self.window.windowNumber, region);
  if (region) CFRelease(region);
  if (result != kCGErrorSuccess) {
    self.status.stringValue = [NSString stringWithFormat:
       @"Capture exclusion failed: CGError %d (see Terminal)", (int)result];
    fprintf(stderr, "CGSSetWindowCaptureExcludeShape failed with CGError %d\n", (int)result);
    return;
  }
  NSArray<NSString *> *names = @[@"OFF", @"LEFT HALF", @"RIGHT HALF", @"WHOLE WINDOW"];
  self.status.stringValue = [NSString stringWithFormat:
    @"Capture exclusion: %@ — take a screenshot", names[mode]];
  fprintf(stdout, "CGS exclusion: %s; window=%ld; rect=(%.1f %.1f %.1f %.1f)\n",
          names[mode].UTF8String, (long)self.window.windowNumber,
          local.origin.x, local.origin.y, local.size.width, local.size.height);
  fflush(stdout);
}

- (void)protectLeft:(id)sender { (void)sender; [self setProtection:SDProtectionLeft]; }
- (void)protectRight:(id)sender { (void)sender; [self setProtection:SDProtectionRight]; }
- (void)protectAll:(id)sender { (void)sender; [self setProtection:SDProtectionWhole]; }
- (void)clearProtection:(id)sender { (void)sender; [self setProtection:SDProtectionOff]; }

- (void)windowDidMove:(NSNotification *)notification {
  (void)notification;
  [self updateBacking];
}
- (void)windowDidResize:(NSNotification *)notification {
  (void)notification;
  [self updateBacking];
  if (self.protectionMode != SDProtectionOff) [self setProtection:self.protectionMode];
}
- (void)applicationWillTerminate:(NSNotification *)notification {
  (void)notification;
  if (self.excludeRegion && self.getConnection && self.window) {
    self.excludeRegion(self.getConnection(), (SDWindowID)self.window.windowNumber, NULL);
  }
  [self.blackBacking close];
}
- (BOOL)applicationShouldTerminateAfterLastWindowClosed:(NSApplication *)sender {
  (void)sender;
  return YES;
}
@end

int main(int argc, const char *argv[]) {
  (void)argc; (void)argv;
  @autoreleasepool {
    CaptureRegionLab *lab = [[CaptureRegionLab alloc] init];
    NSApplication *application = [NSApplication sharedApplication];
    application.delegate = lab;
    [application run];
  }
  return 0;
}
