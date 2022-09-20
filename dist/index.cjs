'use strict';

function noop() { }
const identity = x => x;
function assign(tar, src) {
    // @ts-ignore
    for (const k in src)
        tar[k] = src[k];
    return tar;
}
function run(fn) {
    return fn();
}
function blank_object() {
    return Object.create(null);
}
function run_all(fns) {
    fns.forEach(run);
}
function is_function(thing) {
    return typeof thing === 'function';
}
function safe_not_equal(a, b) {
    return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
}
function is_empty(obj) {
    return Object.keys(obj).length === 0;
}
function subscribe(store, ...callbacks) {
    if (store == null) {
        return noop;
    }
    const unsub = store.subscribe(...callbacks);
    return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
}
function component_subscribe(component, store, callback) {
    component.$$.on_destroy.push(subscribe(store, callback));
}
function create_slot(definition, ctx, $$scope, fn) {
    if (definition) {
        const slot_ctx = get_slot_context(definition, ctx, $$scope, fn);
        return definition[0](slot_ctx);
    }
}
function get_slot_context(definition, ctx, $$scope, fn) {
    return definition[1] && fn
        ? assign($$scope.ctx.slice(), definition[1](fn(ctx)))
        : $$scope.ctx;
}
function get_slot_changes(definition, $$scope, dirty, fn) {
    if (definition[2] && fn) {
        const lets = definition[2](fn(dirty));
        if ($$scope.dirty === undefined) {
            return lets;
        }
        if (typeof lets === 'object') {
            const merged = [];
            const len = Math.max($$scope.dirty.length, lets.length);
            for (let i = 0; i < len; i += 1) {
                merged[i] = $$scope.dirty[i] | lets[i];
            }
            return merged;
        }
        return $$scope.dirty | lets;
    }
    return $$scope.dirty;
}
function update_slot_base(slot, slot_definition, ctx, $$scope, slot_changes, get_slot_context_fn) {
    if (slot_changes) {
        const slot_context = get_slot_context(slot_definition, ctx, $$scope, get_slot_context_fn);
        slot.p(slot_context, slot_changes);
    }
}
function get_all_dirty_from_scope($$scope) {
    if ($$scope.ctx.length > 32) {
        const dirty = [];
        const length = $$scope.ctx.length / 32;
        for (let i = 0; i < length; i++) {
            dirty[i] = -1;
        }
        return dirty;
    }
    return -1;
}
function null_to_empty(value) {
    return value == null ? '' : value;
}
function set_store_value(store, ret, value) {
    store.set(value);
    return ret;
}
function action_destroyer(action_result) {
    return action_result && is_function(action_result.destroy) ? action_result.destroy : noop;
}

const is_client = typeof window !== 'undefined';
let now = is_client
    ? () => window.performance.now()
    : () => Date.now();
let raf = is_client ? cb => requestAnimationFrame(cb) : noop;

const tasks = new Set();
function run_tasks(now) {
    tasks.forEach(task => {
        if (!task.c(now)) {
            tasks.delete(task);
            task.f();
        }
    });
    if (tasks.size !== 0)
        raf(run_tasks);
}
/**
 * Creates a new task that runs on each raf frame
 * until it returns a falsy value or is aborted
 */
function loop(callback) {
    let task;
    if (tasks.size === 0)
        raf(run_tasks);
    return {
        promise: new Promise(fulfill => {
            tasks.add(task = { c: callback, f: fulfill });
        }),
        abort() {
            tasks.delete(task);
        }
    };
}
function append(target, node) {
    target.appendChild(node);
}
function get_root_for_style(node) {
    if (!node)
        return document;
    const root = node.getRootNode ? node.getRootNode() : node.ownerDocument;
    if (root && root.host) {
        return root;
    }
    return node.ownerDocument;
}
function append_empty_stylesheet(node) {
    const style_element = element('style');
    append_stylesheet(get_root_for_style(node), style_element);
    return style_element.sheet;
}
function append_stylesheet(node, style) {
    append(node.head || node, style);
}
function insert(target, node, anchor) {
    target.insertBefore(node, anchor || null);
}
function detach(node) {
    node.parentNode.removeChild(node);
}
function destroy_each(iterations, detaching) {
    for (let i = 0; i < iterations.length; i += 1) {
        if (iterations[i])
            iterations[i].d(detaching);
    }
}
function element(name) {
    return document.createElement(name);
}
function text(data) {
    return document.createTextNode(data);
}
function space() {
    return text(' ');
}
function empty() {
    return text('');
}
function listen(node, event, handler, options) {
    node.addEventListener(event, handler, options);
    return () => node.removeEventListener(event, handler, options);
}
function attr(node, attribute, value) {
    if (value == null)
        node.removeAttribute(attribute);
    else if (node.getAttribute(attribute) !== value)
        node.setAttribute(attribute, value);
}
function children(element) {
    return Array.from(element.childNodes);
}
function set_data(text, data) {
    data = '' + data;
    if (text.wholeText !== data)
        text.data = data;
}
function set_input_value(input, value) {
    input.value = value == null ? '' : value;
}
function set_style(node, key, value, important) {
    if (value === null) {
        node.style.removeProperty(key);
    }
    else {
        node.style.setProperty(key, value, important ? 'important' : '');
    }
}
// unfortunately this can't be a constant as that wouldn't be tree-shakeable
// so we cache the result instead
let crossorigin;
function is_crossorigin() {
    if (crossorigin === undefined) {
        crossorigin = false;
        try {
            if (typeof window !== 'undefined' && window.parent) {
                void window.parent.document;
            }
        }
        catch (error) {
            crossorigin = true;
        }
    }
    return crossorigin;
}
function add_resize_listener(node, fn) {
    const computed_style = getComputedStyle(node);
    if (computed_style.position === 'static') {
        node.style.position = 'relative';
    }
    const iframe = element('iframe');
    iframe.setAttribute('style', 'display: block; position: absolute; top: 0; left: 0; width: 100%; height: 100%; ' +
        'overflow: hidden; border: 0; opacity: 0; pointer-events: none; z-index: -1;');
    iframe.setAttribute('aria-hidden', 'true');
    iframe.tabIndex = -1;
    const crossorigin = is_crossorigin();
    let unsubscribe;
    if (crossorigin) {
        iframe.src = "data:text/html,<script>onresize=function(){parent.postMessage(0,'*')}</script>";
        unsubscribe = listen(window, 'message', (event) => {
            if (event.source === iframe.contentWindow)
                fn();
        });
    }
    else {
        iframe.src = 'about:blank';
        iframe.onload = () => {
            unsubscribe = listen(iframe.contentWindow, 'resize', fn);
        };
    }
    append(node, iframe);
    return () => {
        if (crossorigin) {
            unsubscribe();
        }
        else if (unsubscribe && iframe.contentWindow) {
            unsubscribe();
        }
        detach(iframe);
    };
}
function toggle_class(element, name, toggle) {
    element.classList[toggle ? 'add' : 'remove'](name);
}
function custom_event(type, detail, { bubbles = false, cancelable = false } = {}) {
    const e = document.createEvent('CustomEvent');
    e.initCustomEvent(type, bubbles, cancelable, detail);
    return e;
}

// we need to store the information for multiple documents because a Svelte application could also contain iframes
// https://github.com/sveltejs/svelte/issues/3624
const managed_styles = new Map();
let active = 0;
// https://github.com/darkskyapp/string-hash/blob/master/index.js
function hash(str) {
    let hash = 5381;
    let i = str.length;
    while (i--)
        hash = ((hash << 5) - hash) ^ str.charCodeAt(i);
    return hash >>> 0;
}
function create_style_information(doc, node) {
    const info = { stylesheet: append_empty_stylesheet(node), rules: {} };
    managed_styles.set(doc, info);
    return info;
}
function create_rule(node, a, b, duration, delay, ease, fn, uid = 0) {
    const step = 16.666 / duration;
    let keyframes = '{\n';
    for (let p = 0; p <= 1; p += step) {
        const t = a + (b - a) * ease(p);
        keyframes += p * 100 + `%{${fn(t, 1 - t)}}\n`;
    }
    const rule = keyframes + `100% {${fn(b, 1 - b)}}\n}`;
    const name = `__svelte_${hash(rule)}_${uid}`;
    const doc = get_root_for_style(node);
    const { stylesheet, rules } = managed_styles.get(doc) || create_style_information(doc, node);
    if (!rules[name]) {
        rules[name] = true;
        stylesheet.insertRule(`@keyframes ${name} ${rule}`, stylesheet.cssRules.length);
    }
    const animation = node.style.animation || '';
    node.style.animation = `${animation ? `${animation}, ` : ''}${name} ${duration}ms linear ${delay}ms 1 both`;
    active += 1;
    return name;
}
function delete_rule(node, name) {
    const previous = (node.style.animation || '').split(', ');
    const next = previous.filter(name
        ? anim => anim.indexOf(name) < 0 // remove specific animation
        : anim => anim.indexOf('__svelte') === -1 // remove all Svelte animations
    );
    const deleted = previous.length - next.length;
    if (deleted) {
        node.style.animation = next.join(', ');
        active -= deleted;
        if (!active)
            clear_rules();
    }
}
function clear_rules() {
    raf(() => {
        if (active)
            return;
        managed_styles.forEach(info => {
            const { stylesheet } = info;
            let i = stylesheet.cssRules.length;
            while (i--)
                stylesheet.deleteRule(i);
            info.rules = {};
        });
        managed_styles.clear();
    });
}

let current_component;
function set_current_component(component) {
    current_component = component;
}
function get_current_component() {
    if (!current_component)
        throw new Error('Function called outside component initialization');
    return current_component;
}
function onMount(fn) {
    get_current_component().$$.on_mount.push(fn);
}
function createEventDispatcher() {
    const component = get_current_component();
    return (type, detail, { cancelable = false } = {}) => {
        const callbacks = component.$$.callbacks[type];
        if (callbacks) {
            // TODO are there situations where events could be dispatched
            // in a server (non-DOM) environment?
            const event = custom_event(type, detail, { cancelable });
            callbacks.slice().forEach(fn => {
                fn.call(component, event);
            });
            return !event.defaultPrevented;
        }
        return true;
    };
}
function setContext(key, context) {
    get_current_component().$$.context.set(key, context);
    return context;
}
function getContext(key) {
    return get_current_component().$$.context.get(key);
}

const dirty_components = [];
const binding_callbacks = [];
const render_callbacks = [];
const flush_callbacks = [];
const resolved_promise = Promise.resolve();
let update_scheduled = false;
function schedule_update() {
    if (!update_scheduled) {
        update_scheduled = true;
        resolved_promise.then(flush);
    }
}
function add_render_callback(fn) {
    render_callbacks.push(fn);
}
function add_flush_callback(fn) {
    flush_callbacks.push(fn);
}
// flush() calls callbacks in this order:
// 1. All beforeUpdate callbacks, in order: parents before children
// 2. All bind:this callbacks, in reverse order: children before parents.
// 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
//    for afterUpdates called during the initial onMount, which are called in
//    reverse order: children before parents.
// Since callbacks might update component values, which could trigger another
// call to flush(), the following steps guard against this:
// 1. During beforeUpdate, any updated components will be added to the
//    dirty_components array and will cause a reentrant call to flush(). Because
//    the flush index is kept outside the function, the reentrant call will pick
//    up where the earlier call left off and go through all dirty components. The
//    current_component value is saved and restored so that the reentrant call will
//    not interfere with the "parent" flush() call.
// 2. bind:this callbacks cannot trigger new flush() calls.
// 3. During afterUpdate, any updated components will NOT have their afterUpdate
//    callback called a second time; the seen_callbacks set, outside the flush()
//    function, guarantees this behavior.
const seen_callbacks = new Set();
let flushidx = 0; // Do *not* move this inside the flush() function
function flush() {
    const saved_component = current_component;
    do {
        // first, call beforeUpdate functions
        // and update components
        while (flushidx < dirty_components.length) {
            const component = dirty_components[flushidx];
            flushidx++;
            set_current_component(component);
            update(component.$$);
        }
        set_current_component(null);
        dirty_components.length = 0;
        flushidx = 0;
        while (binding_callbacks.length)
            binding_callbacks.pop()();
        // then, once components are updated, call
        // afterUpdate functions. This may cause
        // subsequent updates...
        for (let i = 0; i < render_callbacks.length; i += 1) {
            const callback = render_callbacks[i];
            if (!seen_callbacks.has(callback)) {
                // ...so guard against infinite loops
                seen_callbacks.add(callback);
                callback();
            }
        }
        render_callbacks.length = 0;
    } while (dirty_components.length);
    while (flush_callbacks.length) {
        flush_callbacks.pop()();
    }
    update_scheduled = false;
    seen_callbacks.clear();
    set_current_component(saved_component);
}
function update($$) {
    if ($$.fragment !== null) {
        $$.update();
        run_all($$.before_update);
        const dirty = $$.dirty;
        $$.dirty = [-1];
        $$.fragment && $$.fragment.p($$.ctx, dirty);
        $$.after_update.forEach(add_render_callback);
    }
}

let promise;
function wait() {
    if (!promise) {
        promise = Promise.resolve();
        promise.then(() => {
            promise = null;
        });
    }
    return promise;
}
function dispatch(node, direction, kind) {
    node.dispatchEvent(custom_event(`${direction ? 'intro' : 'outro'}${kind}`));
}
const outroing = new Set();
let outros;
function group_outros() {
    outros = {
        r: 0,
        c: [],
        p: outros // parent group
    };
}
function check_outros() {
    if (!outros.r) {
        run_all(outros.c);
    }
    outros = outros.p;
}
function transition_in(block, local) {
    if (block && block.i) {
        outroing.delete(block);
        block.i(local);
    }
}
function transition_out(block, local, detach, callback) {
    if (block && block.o) {
        if (outroing.has(block))
            return;
        outroing.add(block);
        outros.c.push(() => {
            outroing.delete(block);
            if (callback) {
                if (detach)
                    block.d(1);
                callback();
            }
        });
        block.o(local);
    }
    else if (callback) {
        callback();
    }
}
const null_transition = { duration: 0 };
function create_in_transition(node, fn, params) {
    let config = fn(node, params);
    let running = false;
    let animation_name;
    let task;
    let uid = 0;
    function cleanup() {
        if (animation_name)
            delete_rule(node, animation_name);
    }
    function go() {
        const { delay = 0, duration = 300, easing = identity, tick = noop, css } = config || null_transition;
        if (css)
            animation_name = create_rule(node, 0, 1, duration, delay, easing, css, uid++);
        tick(0, 1);
        const start_time = now() + delay;
        const end_time = start_time + duration;
        if (task)
            task.abort();
        running = true;
        add_render_callback(() => dispatch(node, true, 'start'));
        task = loop(now => {
            if (running) {
                if (now >= end_time) {
                    tick(1, 0);
                    dispatch(node, true, 'end');
                    cleanup();
                    return running = false;
                }
                if (now >= start_time) {
                    const t = easing((now - start_time) / duration);
                    tick(t, 1 - t);
                }
            }
            return running;
        });
    }
    let started = false;
    return {
        start() {
            if (started)
                return;
            started = true;
            delete_rule(node);
            if (is_function(config)) {
                config = config();
                wait().then(go);
            }
            else {
                go();
            }
        },
        invalidate() {
            started = false;
        },
        end() {
            if (running) {
                cleanup();
                running = false;
            }
        }
    };
}
function create_out_transition(node, fn, params) {
    let config = fn(node, params);
    let running = true;
    let animation_name;
    const group = outros;
    group.r += 1;
    function go() {
        const { delay = 0, duration = 300, easing = identity, tick = noop, css } = config || null_transition;
        if (css)
            animation_name = create_rule(node, 1, 0, duration, delay, easing, css);
        const start_time = now() + delay;
        const end_time = start_time + duration;
        add_render_callback(() => dispatch(node, false, 'start'));
        loop(now => {
            if (running) {
                if (now >= end_time) {
                    tick(0, 1);
                    dispatch(node, false, 'end');
                    if (!--group.r) {
                        // this will result in `end()` being called,
                        // so we don't need to clean up here
                        run_all(group.c);
                    }
                    return false;
                }
                if (now >= start_time) {
                    const t = easing((now - start_time) / duration);
                    tick(1 - t, t);
                }
            }
            return running;
        });
    }
    if (is_function(config)) {
        wait().then(() => {
            // @ts-ignore
            config = config();
            go();
        });
    }
    else {
        go();
    }
    return {
        end(reset) {
            if (reset && config.tick) {
                config.tick(1, 0);
            }
            if (running) {
                if (animation_name)
                    delete_rule(node, animation_name);
                running = false;
            }
        }
    };
}

function bind(component, name, callback) {
    const index = component.$$.props[name];
    if (index !== undefined) {
        component.$$.bound[index] = callback;
        callback(component.$$.ctx[index]);
    }
}
function create_component(block) {
    block && block.c();
}
function mount_component(component, target, anchor, customElement) {
    const { fragment, on_mount, on_destroy, after_update } = component.$$;
    fragment && fragment.m(target, anchor);
    if (!customElement) {
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
    }
    after_update.forEach(add_render_callback);
}
function destroy_component(component, detaching) {
    const $$ = component.$$;
    if ($$.fragment !== null) {
        run_all($$.on_destroy);
        $$.fragment && $$.fragment.d(detaching);
        // TODO null out other refs, including component.$$ (but need to
        // preserve final state?)
        $$.on_destroy = $$.fragment = null;
        $$.ctx = [];
    }
}
function make_dirty(component, i) {
    if (component.$$.dirty[0] === -1) {
        dirty_components.push(component);
        schedule_update();
        component.$$.dirty.fill(0);
    }
    component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
}
function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
    const parent_component = current_component;
    set_current_component(component);
    const $$ = component.$$ = {
        fragment: null,
        ctx: null,
        // state
        props,
        update: noop,
        not_equal,
        bound: blank_object(),
        // lifecycle
        on_mount: [],
        on_destroy: [],
        on_disconnect: [],
        before_update: [],
        after_update: [],
        context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
        // everything else
        callbacks: blank_object(),
        dirty,
        skip_bound: false,
        root: options.target || parent_component.$$.root
    };
    append_styles && append_styles($$.root);
    let ready = false;
    $$.ctx = instance
        ? instance(component, options.props || {}, (i, ret, ...rest) => {
            const value = rest.length ? rest[0] : ret;
            if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                if (!$$.skip_bound && $$.bound[i])
                    $$.bound[i](value);
                if (ready)
                    make_dirty(component, i);
            }
            return ret;
        })
        : [];
    $$.update();
    ready = true;
    run_all($$.before_update);
    // `false` as a special case of no DOM component
    $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
    if (options.target) {
        if (options.hydrate) {
            const nodes = children(options.target);
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            $$.fragment && $$.fragment.l(nodes);
            nodes.forEach(detach);
        }
        else {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            $$.fragment && $$.fragment.c();
        }
        if (options.intro)
            transition_in(component.$$.fragment);
        mount_component(component, options.target, options.anchor, options.customElement);
        flush();
    }
    set_current_component(parent_component);
}
/**
 * Base class for Svelte components. Used when dev=false.
 */
class SvelteComponent {
    $destroy() {
        destroy_component(this, 1);
        this.$destroy = noop;
    }
    $on(type, callback) {
        const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
        callbacks.push(callback);
        return () => {
            const index = callbacks.indexOf(callback);
            if (index !== -1)
                callbacks.splice(index, 1);
        };
    }
    $set($$props) {
        if (this.$$set && !is_empty($$props)) {
            this.$$.skip_bound = true;
            this.$$set($$props);
            this.$$.skip_bound = false;
        }
    }
}

const subscriber_queue = [];
/**
 * Create a `Writable` store that allows both updating and reading by subscription.
 * @param {*=}value initial value
 * @param {StartStopNotifier=}start start and stop notifications for subscriptions
 */
function writable(value, start = noop) {
    let stop;
    const subscribers = new Set();
    function set(new_value) {
        if (safe_not_equal(value, new_value)) {
            value = new_value;
            if (stop) { // store is ready
                const run_queue = !subscriber_queue.length;
                for (const subscriber of subscribers) {
                    subscriber[1]();
                    subscriber_queue.push(subscriber, value);
                }
                if (run_queue) {
                    for (let i = 0; i < subscriber_queue.length; i += 2) {
                        subscriber_queue[i][0](subscriber_queue[i + 1]);
                    }
                    subscriber_queue.length = 0;
                }
            }
        }
    }
    function update(fn) {
        set(fn(value));
    }
    function subscribe(run, invalidate = noop) {
        const subscriber = [run, invalidate];
        subscribers.add(subscriber);
        if (subscribers.size === 1) {
            stop = start(set) || noop;
        }
        run(value);
        return () => {
            subscribers.delete(subscriber);
            if (subscribers.size === 0) {
                stop();
                stop = null;
            }
        };
    }
    return { set, update, subscribe };
}

function clamp(num, min, max) {
    return num < min ? min : num > max ? max : num;
}

/* src/lib/Repl/SplitPane.svelte generated by Svelte v3.49.0 */
const get_b_slot_changes = dirty => ({});
const get_b_slot_context = ctx => ({});
const get_a_slot_changes = dirty => ({});
const get_a_slot_context = ctx => ({});

// (170:2) {#if !fixed}
function create_if_block_1$3(ctx) {
	let div;
	let div_class_value;
	let div_style_value;
	let mounted;
	let dispose;

	return {
		c() {
			div = element("div");
			attr(div, "class", div_class_value = "" + (/*type*/ ctx[1] + " divider" + " svelte-oir88r"));
			attr(div, "style", div_style_value = "" + (/*side*/ ctx[8] + ": calc(" + /*pos*/ ctx[0] + "% - 8px)"));
		},
		m(target, anchor) {
			insert(target, div, anchor);

			if (!mounted) {
				dispose = action_destroyer(/*drag*/ ctx[10].call(null, div, /*setPos*/ ctx[9]));
				mounted = true;
			}
		},
		p(ctx, dirty) {
			if (dirty & /*type*/ 2 && div_class_value !== (div_class_value = "" + (/*type*/ ctx[1] + " divider" + " svelte-oir88r"))) {
				attr(div, "class", div_class_value);
			}

			if (dirty & /*side, pos*/ 257 && div_style_value !== (div_style_value = "" + (/*side*/ ctx[8] + ": calc(" + /*pos*/ ctx[0] + "% - 8px)"))) {
				attr(div, "style", div_style_value);
			}
		},
		d(detaching) {
			if (detaching) detach(div);
			mounted = false;
			dispose();
		}
	};
}

// (178:0) {#if dragging}
function create_if_block$6(ctx) {
	let div;

	return {
		c() {
			div = element("div");
			attr(div, "class", "mousecatcher svelte-oir88r");
		},
		m(target, anchor) {
			insert(target, div, anchor);
		},
		d(detaching) {
			if (detaching) detach(div);
		}
	};
}

function create_fragment$9(ctx) {
	let div2;
	let div0;
	let div0_style_value;
	let t0;
	let div1;
	let div1_style_value;
	let t1;
	let div2_resize_listener;
	let t2;
	let if_block1_anchor;
	let current;
	const a_slot_template = /*#slots*/ ctx[16].a;
	const a_slot = create_slot(a_slot_template, ctx, /*$$scope*/ ctx[15], get_a_slot_context);
	const b_slot_template = /*#slots*/ ctx[16].b;
	const b_slot = create_slot(b_slot_template, ctx, /*$$scope*/ ctx[15], get_b_slot_context);
	let if_block0 = !/*fixed*/ ctx[2] && create_if_block_1$3(ctx);
	let if_block1 = /*dragging*/ ctx[6] && create_if_block$6();

	return {
		c() {
			div2 = element("div");
			div0 = element("div");
			if (a_slot) a_slot.c();
			t0 = space();
			div1 = element("div");
			if (b_slot) b_slot.c();
			t1 = space();
			if (if_block0) if_block0.c();
			t2 = space();
			if (if_block1) if_block1.c();
			if_block1_anchor = empty();
			attr(div0, "class", "pane svelte-oir88r");
			attr(div0, "style", div0_style_value = "" + (/*dimension*/ ctx[7] + ": " + /*pos*/ ctx[0] + "%;"));
			attr(div1, "class", "pane svelte-oir88r");
			attr(div1, "style", div1_style_value = "" + (/*dimension*/ ctx[7] + ": " + (100 - /*pos*/ ctx[0]) + "%;"));
			attr(div2, "class", "container svelte-oir88r");
			add_render_callback(() => /*div2_elementresize_handler*/ ctx[18].call(div2));
		},
		m(target, anchor) {
			insert(target, div2, anchor);
			append(div2, div0);

			if (a_slot) {
				a_slot.m(div0, null);
			}

			append(div2, t0);
			append(div2, div1);

			if (b_slot) {
				b_slot.m(div1, null);
			}

			append(div2, t1);
			if (if_block0) if_block0.m(div2, null);
			/*div2_binding*/ ctx[17](div2);
			div2_resize_listener = add_resize_listener(div2, /*div2_elementresize_handler*/ ctx[18].bind(div2));
			insert(target, t2, anchor);
			if (if_block1) if_block1.m(target, anchor);
			insert(target, if_block1_anchor, anchor);
			current = true;
		},
		p(ctx, [dirty]) {
			if (a_slot) {
				if (a_slot.p && (!current || dirty & /*$$scope*/ 32768)) {
					update_slot_base(
						a_slot,
						a_slot_template,
						ctx,
						/*$$scope*/ ctx[15],
						!current
						? get_all_dirty_from_scope(/*$$scope*/ ctx[15])
						: get_slot_changes(a_slot_template, /*$$scope*/ ctx[15], dirty, get_a_slot_changes),
						get_a_slot_context
					);
				}
			}

			if (!current || dirty & /*dimension, pos*/ 129 && div0_style_value !== (div0_style_value = "" + (/*dimension*/ ctx[7] + ": " + /*pos*/ ctx[0] + "%;"))) {
				attr(div0, "style", div0_style_value);
			}

			if (b_slot) {
				if (b_slot.p && (!current || dirty & /*$$scope*/ 32768)) {
					update_slot_base(
						b_slot,
						b_slot_template,
						ctx,
						/*$$scope*/ ctx[15],
						!current
						? get_all_dirty_from_scope(/*$$scope*/ ctx[15])
						: get_slot_changes(b_slot_template, /*$$scope*/ ctx[15], dirty, get_b_slot_changes),
						get_b_slot_context
					);
				}
			}

			if (!current || dirty & /*dimension, pos*/ 129 && div1_style_value !== (div1_style_value = "" + (/*dimension*/ ctx[7] + ": " + (100 - /*pos*/ ctx[0]) + "%;"))) {
				attr(div1, "style", div1_style_value);
			}

			if (!/*fixed*/ ctx[2]) {
				if (if_block0) {
					if_block0.p(ctx, dirty);
				} else {
					if_block0 = create_if_block_1$3(ctx);
					if_block0.c();
					if_block0.m(div2, null);
				}
			} else if (if_block0) {
				if_block0.d(1);
				if_block0 = null;
			}

			if (/*dragging*/ ctx[6]) {
				if (if_block1) ; else {
					if_block1 = create_if_block$6();
					if_block1.c();
					if_block1.m(if_block1_anchor.parentNode, if_block1_anchor);
				}
			} else if (if_block1) {
				if_block1.d(1);
				if_block1 = null;
			}
		},
		i(local) {
			if (current) return;
			transition_in(a_slot, local);
			transition_in(b_slot, local);
			current = true;
		},
		o(local) {
			transition_out(a_slot, local);
			transition_out(b_slot, local);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(div2);
			if (a_slot) a_slot.d(detaching);
			if (b_slot) b_slot.d(detaching);
			if (if_block0) if_block0.d();
			/*div2_binding*/ ctx[17](null);
			div2_resize_listener();
			if (detaching) detach(t2);
			if (if_block1) if_block1.d(detaching);
			if (detaching) detach(if_block1_anchor);
		}
	};
}

function instance$9($$self, $$props, $$invalidate) {
	let size;
	let side;
	let dimension;
	let { $$slots: slots = {}, $$scope } = $$props;
	const dispatch = createEventDispatcher();
	let { type } = $$props;
	let { pos = 50 } = $$props;
	let { fixed = false } = $$props;
	let { buffer = 40 } = $$props;
	let min;
	let max;
	let w;
	let h;
	const refs = {};
	let dragging = false;

	function setPos(event) {
		const { top, left } = refs.container.getBoundingClientRect();

		const px = type === "vertical"
		? event.clientY - top
		: event.clientX - left;

		$$invalidate(0, pos = 100 * px / size);
		dispatch("change");
	}

	function drag(node, callback) {
		const mousedown = event => {
			if (event.which !== 1) return;
			event.preventDefault();
			$$invalidate(6, dragging = true);

			const onmouseup = () => {
				$$invalidate(6, dragging = false);
				window.removeEventListener("mousemove", callback, false);
				window.removeEventListener("mouseup", onmouseup, false);
			};

			window.addEventListener("mousemove", callback, false);
			window.addEventListener("mouseup", onmouseup, false);
		};

		node.addEventListener("mousedown", mousedown, false);

		return {
			destroy() {
				node.removeEventListener("mousedown", onmousedown, false);
			}
		};
	}

	function div2_binding($$value) {
		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
			refs.container = $$value;
			$$invalidate(5, refs);
		});
	}

	function div2_elementresize_handler() {
		w = this.clientWidth;
		h = this.clientHeight;
		$$invalidate(3, w);
		$$invalidate(4, h);
	}

	$$self.$$set = $$props => {
		if ('type' in $$props) $$invalidate(1, type = $$props.type);
		if ('pos' in $$props) $$invalidate(0, pos = $$props.pos);
		if ('fixed' in $$props) $$invalidate(2, fixed = $$props.fixed);
		if ('buffer' in $$props) $$invalidate(11, buffer = $$props.buffer);
		if ('$$scope' in $$props) $$invalidate(15, $$scope = $$props.$$scope);
	};

	$$self.$$.update = () => {
		if ($$self.$$.dirty & /*type, h, w*/ 26) {
			$$invalidate(14, size = type === "vertical" ? h : w);
		}

		if ($$self.$$.dirty & /*buffer, size*/ 18432) {
			$$invalidate(12, min = 100 * (buffer / size));
		}

		if ($$self.$$.dirty & /*min*/ 4096) {
			$$invalidate(13, max = 100 - min);
		}

		if ($$self.$$.dirty & /*pos, min, max*/ 12289) {
			$$invalidate(0, pos = clamp(pos, min, max));
		}

		if ($$self.$$.dirty & /*type*/ 2) {
			$$invalidate(8, side = type === "horizontal" ? "left" : "top");
		}

		if ($$self.$$.dirty & /*type*/ 2) {
			$$invalidate(7, dimension = type === "horizontal" ? "width" : "height");
		}
	};

	return [
		pos,
		type,
		fixed,
		w,
		h,
		refs,
		dragging,
		dimension,
		side,
		setPos,
		drag,
		buffer,
		min,
		max,
		size,
		$$scope,
		slots,
		div2_binding,
		div2_elementresize_handler
	];
}

class SplitPane extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, instance$9, create_fragment$9, safe_not_equal, { type: 1, pos: 0, fixed: 2, buffer: 11 });
	}
}

/* src/lib/Repl/Input/ComponentSelector.svelte generated by Svelte v3.49.0 */

function get_each_context$1(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[21] = list[i];
	child_ctx[23] = i;
	return child_ctx;
}

// (232:2) {#if $components.length}
function create_if_block$5(ctx) {
	let div;
	let t;
	let mounted;
	let dispose;
	let each_value = /*$components*/ ctx[3];
	let each_blocks = [];

	for (let i = 0; i < each_value.length; i += 1) {
		each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
	}

	let if_block = !/*funky*/ ctx[0] && create_if_block_1$2(ctx);

	return {
		c() {
			div = element("div");

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].c();
			}

			t = space();
			if (if_block) if_block.c();
			attr(div, "class", "file-tabs svelte-1np0xcs");
			toggle_class(div, "funky", /*funky*/ ctx[0]);
		},
		m(target, anchor) {
			insert(target, div, anchor);

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].m(div, null);
			}

			append(div, t);
			if (if_block) if_block.m(div, null);

			if (!mounted) {
				dispose = listen(div, "dblclick", /*addNew*/ ctx[10]);
				mounted = true;
			}
		},
		p(ctx, dirty) {
			if (dirty & /*$components, $selected, funky, selectComponent, editing, isComponentNameUsed, selectInput, closeEdit, remove, editTab*/ 3037) {
				each_value = /*$components*/ ctx[3];
				let i;

				for (i = 0; i < each_value.length; i += 1) {
					const child_ctx = get_each_context$1(ctx, each_value, i);

					if (each_blocks[i]) {
						each_blocks[i].p(child_ctx, dirty);
					} else {
						each_blocks[i] = create_each_block$1(child_ctx);
						each_blocks[i].c();
						each_blocks[i].m(div, t);
					}
				}

				for (; i < each_blocks.length; i += 1) {
					each_blocks[i].d(1);
				}

				each_blocks.length = each_value.length;
			}

			if (!/*funky*/ ctx[0]) {
				if (if_block) {
					if_block.p(ctx, dirty);
				} else {
					if_block = create_if_block_1$2(ctx);
					if_block.c();
					if_block.m(div, null);
				}
			} else if (if_block) {
				if_block.d(1);
				if_block = null;
			}

			if (dirty & /*funky*/ 1) {
				toggle_class(div, "funky", /*funky*/ ctx[0]);
			}
		},
		d(detaching) {
			if (detaching) detach(div);
			destroy_each(each_blocks, detaching);
			if (if_block) if_block.d();
			mounted = false;
			dispose();
		}
	};
}

// (259:10) {:else}
function create_else_block$1(ctx) {
	let div;
	let t0_value = /*component*/ ctx[21].name + "";
	let t0;
	let t1;
	let t2_value = /*component*/ ctx[21].type + "";
	let t2;
	let t3;
	let if_block_anchor;
	let mounted;
	let dispose;

	function click_handler() {
		return /*click_handler*/ ctx[15](/*component*/ ctx[21]);
	}

	let if_block = !/*funky*/ ctx[0] && create_if_block_4(ctx);

	return {
		c() {
			div = element("div");
			t0 = text(t0_value);
			t1 = text(".");
			t2 = text(t2_value);
			t3 = space();
			if (if_block) if_block.c();
			if_block_anchor = empty();
			attr(div, "class", "editable svelte-1np0xcs");
			attr(div, "title", "edit component name");
		},
		m(target, anchor) {
			insert(target, div, anchor);
			append(div, t0);
			append(div, t1);
			append(div, t2);
			insert(target, t3, anchor);
			if (if_block) if_block.m(target, anchor);
			insert(target, if_block_anchor, anchor);

			if (!mounted) {
				dispose = listen(div, "click", click_handler);
				mounted = true;
			}
		},
		p(new_ctx, dirty) {
			ctx = new_ctx;
			if (dirty & /*$components*/ 8 && t0_value !== (t0_value = /*component*/ ctx[21].name + "")) set_data(t0, t0_value);
			if (dirty & /*$components*/ 8 && t2_value !== (t2_value = /*component*/ ctx[21].type + "")) set_data(t2, t2_value);

			if (!/*funky*/ ctx[0]) {
				if (if_block) {
					if_block.p(ctx, dirty);
				} else {
					if_block = create_if_block_4(ctx);
					if_block.c();
					if_block.m(if_block_anchor.parentNode, if_block_anchor);
				}
			} else if (if_block) {
				if_block.d(1);
				if_block = null;
			}
		},
		d(detaching) {
			if (detaching) detach(div);
			if (detaching) detach(t3);
			if (if_block) if_block.d(detaching);
			if (detaching) detach(if_block_anchor);
			mounted = false;
			dispose();
		}
	};
}

// (245:42) 
function create_if_block_3(ctx) {
	let span;

	let t0_value = /*editing*/ ctx[2].name + ((/\./).test(/*editing*/ ctx[2].name)
	? ''
	: `.${/*editing*/ ctx[2].type}`) + "";

	let t0;
	let t1;
	let input;
	let mounted;
	let dispose;

	return {
		c() {
			span = element("span");
			t0 = text(t0_value);
			t1 = space();
			input = element("input");
			attr(span, "class", "input-sizer svelte-1np0xcs");
			input.autofocus = true;
			attr(input, "spellcheck", false);
			attr(input, "class", "svelte-1np0xcs");
			toggle_class(input, "duplicate", /*isComponentNameUsed*/ ctx[11](/*editing*/ ctx[2]));
		},
		m(target, anchor) {
			insert(target, span, anchor);
			append(span, t0);
			insert(target, t1, anchor);
			insert(target, input, anchor);
			set_input_value(input, /*editing*/ ctx[2].name);
			input.focus();

			if (!mounted) {
				dispose = [
					listen(input, "input", /*input_input_handler*/ ctx[13]),
					listen(input, "focus", selectInput),
					listen(input, "blur", /*closeEdit*/ ctx[8]),
					listen(input, "keydown", /*keydown_handler*/ ctx[14])
				];

				mounted = true;
			}
		},
		p(ctx, dirty) {
			if (dirty & /*editing*/ 4 && t0_value !== (t0_value = /*editing*/ ctx[2].name + ((/\./).test(/*editing*/ ctx[2].name)
			? ''
			: `.${/*editing*/ ctx[2].type}`) + "")) set_data(t0, t0_value);

			if (dirty & /*editing*/ 4 && input.value !== /*editing*/ ctx[2].name) {
				set_input_value(input, /*editing*/ ctx[2].name);
			}

			if (dirty & /*isComponentNameUsed, editing*/ 2052) {
				toggle_class(input, "duplicate", /*isComponentNameUsed*/ ctx[11](/*editing*/ ctx[2]));
			}
		},
		d(detaching) {
			if (detaching) detach(span);
			if (detaching) detach(t1);
			if (detaching) detach(input);
			mounted = false;
			run_all(dispose);
		}
	};
}

// (243:10) {#if component.name == 'App' && index === 0}
function create_if_block_2$1(ctx) {
	let div;
	let t0;
	let t1_value = /*component*/ ctx[21].type + "";
	let t1;

	return {
		c() {
			div = element("div");
			t0 = text("App.");
			t1 = text(t1_value);
			attr(div, "class", "uneditable svelte-1np0xcs");
		},
		m(target, anchor) {
			insert(target, div, anchor);
			append(div, t0);
			append(div, t1);
		},
		p(ctx, dirty) {
			if (dirty & /*$components*/ 8 && t1_value !== (t1_value = /*component*/ ctx[21].type + "")) set_data(t1, t1_value);
		},
		d(detaching) {
			if (detaching) detach(div);
		}
	};
}

// (267:12) {#if !funky}
function create_if_block_4(ctx) {
	let span;
	let mounted;
	let dispose;

	function click_handler_1() {
		return /*click_handler_1*/ ctx[16](/*component*/ ctx[21]);
	}

	return {
		c() {
			span = element("span");
			span.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" class="svelte-1np0xcs"><line stroke="#999" x1="18" y1="6" x2="6" y2="18"></line><line stroke="#999" x1="6" y1="6" x2="18" y2="18"></line></svg>`;
			attr(span, "class", "remove svelte-1np0xcs");
		},
		m(target, anchor) {
			insert(target, span, anchor);

			if (!mounted) {
				dispose = listen(span, "click", click_handler_1);
				mounted = true;
			}
		},
		p(new_ctx, dirty) {
			ctx = new_ctx;
		},
		d(detaching) {
			if (detaching) detach(span);
			mounted = false;
			dispose();
		}
	};
}

// (234:6) {#each $components as component, index}
function create_each_block$1(ctx) {
	let div;
	let div_id_value;
	let mounted;
	let dispose;

	function select_block_type(ctx, dirty) {
		if (/*component*/ ctx[21].name == 'App' && /*index*/ ctx[23] === 0) return create_if_block_2$1;
		if (/*component*/ ctx[21] === /*editing*/ ctx[2]) return create_if_block_3;
		return create_else_block$1;
	}

	let current_block_type = select_block_type(ctx);
	let if_block = current_block_type(ctx);

	function click_handler_2() {
		return /*click_handler_2*/ ctx[17](/*component*/ ctx[21]);
	}

	return {
		c() {
			div = element("div");
			if_block.c();
			attr(div, "id", div_id_value = /*component*/ ctx[21].name);
			attr(div, "class", "button svelte-1np0xcs");
			attr(div, "role", "button");
			toggle_class(div, "active", /*component*/ ctx[21] === /*$selected*/ ctx[4]);
			toggle_class(div, "funky", /*funky*/ ctx[0]);
		},
		m(target, anchor) {
			insert(target, div, anchor);
			if_block.m(div, null);

			if (!mounted) {
				dispose = [
					listen(div, "click", click_handler_2),
					listen(div, "dblclick", dblclick_handler)
				];

				mounted = true;
			}
		},
		p(new_ctx, dirty) {
			ctx = new_ctx;

			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block) {
				if_block.p(ctx, dirty);
			} else {
				if_block.d(1);
				if_block = current_block_type(ctx);

				if (if_block) {
					if_block.c();
					if_block.m(div, null);
				}
			}

			if (dirty & /*$components*/ 8 && div_id_value !== (div_id_value = /*component*/ ctx[21].name)) {
				attr(div, "id", div_id_value);
			}

			if (dirty & /*$components, $selected*/ 24) {
				toggle_class(div, "active", /*component*/ ctx[21] === /*$selected*/ ctx[4]);
			}

			if (dirty & /*funky*/ 1) {
				toggle_class(div, "funky", /*funky*/ ctx[0]);
			}
		},
		d(detaching) {
			if (detaching) detach(div);
			if_block.d();
			mounted = false;
			run_all(dispose);
		}
	};
}

// (279:6) {#if !funky}
function create_if_block_1$2(ctx) {
	let button;
	let mounted;
	let dispose;

	return {
		c() {
			button = element("button");
			button.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" class="svelte-1np0xcs"><line stroke="#999" x1="12" y1="5" x2="12" y2="19"></line><line stroke="#999" x1="5" y1="12" x2="19" y2="12"></line></svg>`;
			attr(button, "class", "add-new svelte-1np0xcs");
			attr(button, "title", "add new component");
		},
		m(target, anchor) {
			insert(target, button, anchor);

			if (!mounted) {
				dispose = listen(button, "click", /*addNew*/ ctx[10]);
				mounted = true;
			}
		},
		p: noop,
		d(detaching) {
			if (detaching) detach(button);
			mounted = false;
			dispose();
		}
	};
}

function create_fragment$8(ctx) {
	let div;
	let if_block = /*$components*/ ctx[3].length && create_if_block$5(ctx);

	return {
		c() {
			div = element("div");
			if (if_block) if_block.c();
			attr(div, "class", "component-selector svelte-1np0xcs");
		},
		m(target, anchor) {
			insert(target, div, anchor);
			if (if_block) if_block.m(div, null);
		},
		p(ctx, [dirty]) {
			if (/*$components*/ ctx[3].length) {
				if (if_block) {
					if_block.p(ctx, dirty);
				} else {
					if_block = create_if_block$5(ctx);
					if_block.c();
					if_block.m(div, null);
				}
			} else if (if_block) {
				if_block.d(1);
				if_block = null;
			}
		},
		i: noop,
		o: noop,
		d(detaching) {
			if (detaching) detach(div);
			if (if_block) if_block.d();
		}
	};
}

function selectInput(event) {
	setTimeout(() => {
		event.target.select();
	});
}

const dblclick_handler = e => e.stopPropagation();

function instance$8($$self, $$props, $$invalidate) {
	let $components,
		$$unsubscribe_components = noop,
		$$subscribe_components = () => ($$unsubscribe_components(), $$unsubscribe_components = subscribe(components, $$value => $$invalidate(3, $components = $$value)), components);

	let $selected;
	$$self.$$.on_destroy.push(() => $$unsubscribe_components());
	let { handle_select } = $$props;
	let { funky } = $$props;
	const { components, selected, request_focus, rebundle } = getContext("REPL");
	$$subscribe_components();
	component_subscribe($$self, selected, value => $$invalidate(4, $selected = value));
	let editing = null;

	function selectComponent(component) {
		if ($selected !== component) {
			$$invalidate(2, editing = null);
			handle_select(component);
		}
	}

	function editTab(component) {
		if ($selected === component) {
			$$invalidate(2, editing = $selected);
		}
	}

	function closeEdit() {
		const match = (/(.+)\.(svelte|svx|js)$/).exec($selected.name);
		set_store_value(selected, $selected.name = match ? match[1] : $selected.name, $selected);

		if (isComponentNameUsed($selected)) {
			set_store_value(selected, $selected.name = $selected.name + "_1", $selected);
		}

		if (match && match[2]) set_store_value(selected, $selected.type = match[2], $selected);
		$$invalidate(2, editing = null);

		// re-select, in case the type changed
		handle_select($selected);

		$$subscribe_components($$invalidate(1, components)); // TODO necessary?

		// focus the editor, but wait a beat (so key events aren't misdirected)
		setTimeout(request_focus);

		rebundle();
	}

	function remove(component) {
		let result = confirm(`Are you sure you want to delete ${component.name}.${component.type}?`);

		if (result) {
			const index = $components.indexOf(component);

			if (~index) {
				components.set($components.slice(0, index).concat($components.slice(index + 1)));
			} else {
				console.error(`Could not find component! That's... odd`);
			}

			handle_select($components[index] || $components[$components.length - 1]);
		}
	}

	let uid = 1;

	function addNew() {
		const component = {
			name: uid++ ? `Component${uid}` : "Component1",
			type: "svelte",
			source: ""
		};

		$$invalidate(2, editing = component);

		setTimeout(() => {
			// TODO we can do this without IDs
			document.getElementById(component.name).scrollIntoView(false);
		});

		components.update(components => components.concat(component));
		handle_select(component);
	}

	function isComponentNameUsed(editing) {
		return $components.find(component => component !== editing && component.name === editing.name);
	}

	function input_input_handler() {
		editing.name = this.value;
		$$invalidate(2, editing);
	}

	const keydown_handler = e => e.which === 13 && !isComponentNameUsed(editing) && e.target.blur();
	const click_handler = component => editTab(component);
	const click_handler_1 = component => remove(component);
	const click_handler_2 = component => selectComponent(component);

	$$self.$$set = $$props => {
		if ('handle_select' in $$props) $$invalidate(12, handle_select = $$props.handle_select);
		if ('funky' in $$props) $$invalidate(0, funky = $$props.funky);
	};

	return [
		funky,
		components,
		editing,
		$components,
		$selected,
		selected,
		selectComponent,
		editTab,
		closeEdit,
		remove,
		addNew,
		isComponentNameUsed,
		handle_select,
		input_input_handler,
		keydown_handler,
		click_handler,
		click_handler_1,
		click_handler_2
	];
}

class ComponentSelector extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, instance$8, create_fragment$8, safe_not_equal, { handle_select: 12, funky: 0 });
	}
}

function cubicOut(t) {
    const f = t - 1.0;
    return f * f * f + 1.0;
}

function slide(node, { delay = 0, duration = 400, easing = cubicOut } = {}) {
    const style = getComputedStyle(node);
    const opacity = +style.opacity;
    const height = parseFloat(style.height);
    const padding_top = parseFloat(style.paddingTop);
    const padding_bottom = parseFloat(style.paddingBottom);
    const margin_top = parseFloat(style.marginTop);
    const margin_bottom = parseFloat(style.marginBottom);
    const border_top_width = parseFloat(style.borderTopWidth);
    const border_bottom_width = parseFloat(style.borderBottomWidth);
    return {
        delay,
        duration,
        easing,
        css: t => 'overflow: hidden;' +
            `opacity: ${Math.min(t * 20, 1) * opacity};` +
            `height: ${t * height}px;` +
            `padding-top: ${t * padding_top}px;` +
            `padding-bottom: ${t * padding_bottom}px;` +
            `margin-top: ${t * margin_top}px;` +
            `margin-bottom: ${t * margin_bottom}px;` +
            `border-top-width: ${t * border_top_width}px;` +
            `border-bottom-width: ${t * border_bottom_width}px;`
    };
}

/* src/lib/Repl/Message.svelte generated by Svelte v3.49.0 */

function create_else_block(ctx) {
	let current;
	const default_slot_template = /*#slots*/ ctx[7].default;
	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[6], null);

	return {
		c() {
			if (default_slot) default_slot.c();
		},
		m(target, anchor) {
			if (default_slot) {
				default_slot.m(target, anchor);
			}

			current = true;
		},
		p(ctx, dirty) {
			if (default_slot) {
				if (default_slot.p && (!current || dirty & /*$$scope*/ 64)) {
					update_slot_base(
						default_slot,
						default_slot_template,
						ctx,
						/*$$scope*/ ctx[6],
						!current
						? get_all_dirty_from_scope(/*$$scope*/ ctx[6])
						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[6], dirty, null),
						null
					);
				}
			}
		},
		i(local) {
			if (current) return;
			transition_in(default_slot, local);
			current = true;
		},
		o(local) {
			transition_out(default_slot, local);
			current = false;
		},
		d(detaching) {
			if (default_slot) default_slot.d(detaching);
		}
	};
}

// (83:1) {#if details}
function create_if_block$4(ctx) {
	let p;
	let t_value = /*message*/ ctx[4](/*details*/ ctx[1]) + "";
	let t;
	let mounted;
	let dispose;

	return {
		c() {
			p = element("p");
			t = text(t_value);
			attr(p, "class", "svelte-9488n4");
			toggle_class(p, "navigable", /*details*/ ctx[1].filename);
		},
		m(target, anchor) {
			insert(target, p, anchor);
			append(p, t);

			if (!mounted) {
				dispose = listen(p, "click", /*click_handler*/ ctx[8]);
				mounted = true;
			}
		},
		p(ctx, dirty) {
			if (dirty & /*details*/ 2 && t_value !== (t_value = /*message*/ ctx[4](/*details*/ ctx[1]) + "")) set_data(t, t_value);

			if (dirty & /*details*/ 2) {
				toggle_class(p, "navigable", /*details*/ ctx[1].filename);
			}
		},
		i: noop,
		o: noop,
		d(detaching) {
			if (detaching) detach(p);
			mounted = false;
			dispose();
		}
	};
}

function create_fragment$7(ctx) {
	let div;
	let current_block_type_index;
	let if_block;
	let div_class_value;
	let div_intro;
	let div_outro;
	let current;
	const if_block_creators = [create_if_block$4, create_else_block];
	const if_blocks = [];

	function select_block_type(ctx, dirty) {
		if (/*details*/ ctx[1]) return 0;
		return 1;
	}

	current_block_type_index = select_block_type(ctx);
	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

	return {
		c() {
			div = element("div");
			if_block.c();
			attr(div, "class", div_class_value = "message " + /*kind*/ ctx[0] + " svelte-9488n4");
			toggle_class(div, "truncate", /*truncate*/ ctx[2]);
		},
		m(target, anchor) {
			insert(target, div, anchor);
			if_blocks[current_block_type_index].m(div, null);
			current = true;
		},
		p(ctx, [dirty]) {
			let previous_block_index = current_block_type_index;
			current_block_type_index = select_block_type(ctx);

			if (current_block_type_index === previous_block_index) {
				if_blocks[current_block_type_index].p(ctx, dirty);
			} else {
				group_outros();

				transition_out(if_blocks[previous_block_index], 1, 1, () => {
					if_blocks[previous_block_index] = null;
				});

				check_outros();
				if_block = if_blocks[current_block_type_index];

				if (!if_block) {
					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
					if_block.c();
				} else {
					if_block.p(ctx, dirty);
				}

				transition_in(if_block, 1);
				if_block.m(div, null);
			}

			if (!current || dirty & /*kind*/ 1 && div_class_value !== (div_class_value = "message " + /*kind*/ ctx[0] + " svelte-9488n4")) {
				attr(div, "class", div_class_value);
			}

			if (dirty & /*kind, truncate*/ 5) {
				toggle_class(div, "truncate", /*truncate*/ ctx[2]);
			}
		},
		i(local) {
			if (current) return;
			transition_in(if_block);

			add_render_callback(() => {
				if (div_outro) div_outro.end(1);
				div_intro = create_in_transition(div, slide, { delay: 150, duration: 100 });
				div_intro.start();
			});

			current = true;
		},
		o(local) {
			transition_out(if_block);
			if (div_intro) div_intro.invalidate();
			div_outro = create_out_transition(div, slide, { duration: 100 });
			current = false;
		},
		d(detaching) {
			if (detaching) detach(div);
			if_blocks[current_block_type_index].d();
			if (detaching && div_outro) div_outro.end();
		}
	};
}

function instance$7($$self, $$props, $$invalidate) {
	let { $$slots: slots = {}, $$scope } = $$props;
	const { navigate } = getContext('REPL');
	let { kind } = $$props;
	let { details = null } = $$props;
	let { filename = null } = $$props;
	let { truncate } = $$props;

	function message(details) {
		let str = details.message || '[missing message]';
		let loc = [];

		if (details.filename && details.filename !== filename) {
			loc.push(details.filename);
		}

		if (details.start) loc.push(details.start.line, details.start.column);
		return str + (loc.length ? ` (${loc.join(':')})` : ``);
	}
	const click_handler = () => navigate(details);

	$$self.$$set = $$props => {
		if ('kind' in $$props) $$invalidate(0, kind = $$props.kind);
		if ('details' in $$props) $$invalidate(1, details = $$props.details);
		if ('filename' in $$props) $$invalidate(5, filename = $$props.filename);
		if ('truncate' in $$props) $$invalidate(2, truncate = $$props.truncate);
		if ('$$scope' in $$props) $$invalidate(6, $$scope = $$props.$$scope);
	};

	return [
		kind,
		details,
		truncate,
		navigate,
		message,
		filename,
		$$scope,
		slots,
		click_handler
	];
}

class Message extends SvelteComponent {
	constructor(options) {
		super();

		init(this, options, instance$7, create_fragment$7, safe_not_equal, {
			kind: 0,
			details: 1,
			filename: 5,
			truncate: 2
		});
	}
}

/* src/lib/Repl/CodeMirror.svelte generated by Svelte v3.49.0 */

function create_if_block$3(ctx) {
	let pre;
	let t0;
	let t1;
	let div;
	let message;
	let current;

	message = new Message({
			props: {
				kind: "info",
				$$slots: { default: [create_default_slot$1] },
				$$scope: { ctx }
			}
		});

	return {
		c() {
			pre = element("pre");
			t0 = text(/*code*/ ctx[3]);
			t1 = space();
			div = element("div");
			create_component(message.$$.fragment);
			set_style(pre, "position", "absolute");
			set_style(pre, "left", "0");
			set_style(pre, "top", "0");
			attr(pre, "class", "svelte-1uv9syl");
			set_style(div, "position", "absolute");
			set_style(div, "width", "100%");
			set_style(div, "bottom", "0");
		},
		m(target, anchor) {
			insert(target, pre, anchor);
			append(pre, t0);
			insert(target, t1, anchor);
			insert(target, div, anchor);
			mount_component(message, div, null);
			current = true;
		},
		p(ctx, dirty) {
			if (!current || dirty & /*code*/ 8) set_data(t0, /*code*/ ctx[3]);
			const message_changes = {};

			if (dirty & /*$$scope*/ 134217728) {
				message_changes.$$scope = { dirty, ctx };
			}

			message.$set(message_changes);
		},
		i(local) {
			if (current) return;
			transition_in(message.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(message.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(pre);
			if (detaching) detach(t1);
			if (detaching) detach(div);
			destroy_component(message);
		}
	};
}

// (267:6) <Message kind="info">
function create_default_slot$1(ctx) {
	let t;

	return {
		c() {
			t = text("loading editor...");
		},
		m(target, anchor) {
			insert(target, t, anchor);
		},
		d(detaching) {
			if (detaching) detach(t);
		}
	};
}

function create_fragment$6(ctx) {
	let t0;
	let div;
	let textarea;
	let t1;
	let div_resize_listener;
	let current;
	let if_block = !/*CodeMirror*/ ctx[5] && create_if_block$3(ctx);

	return {
		c() {
			t0 = text("[\n\n\n\n");
			div = element("div");
			textarea = element("textarea");
			t1 = space();
			if (if_block) if_block.c();
			attr(textarea, "tabindex", "2");
			textarea.readOnly = true;
			textarea.value = /*code*/ ctx[3];
			attr(textarea, "class", "svelte-1uv9syl");
			attr(div, "class", "codemirror-container svelte-1uv9syl");
			add_render_callback(() => /*div_elementresize_handler*/ ctx[19].call(div));
			toggle_class(div, "flex", /*flex*/ ctx[0]);
		},
		m(target, anchor) {
			insert(target, t0, anchor);
			insert(target, div, anchor);
			append(div, textarea);
			/*textarea_binding*/ ctx[18](textarea);
			append(div, t1);
			if (if_block) if_block.m(div, null);
			div_resize_listener = add_resize_listener(div, /*div_elementresize_handler*/ ctx[19].bind(div));
			current = true;
		},
		p(ctx, [dirty]) {
			if (!current || dirty & /*code*/ 8) {
				textarea.value = /*code*/ ctx[3];
			}

			if (!/*CodeMirror*/ ctx[5]) {
				if (if_block) {
					if_block.p(ctx, dirty);

					if (dirty & /*CodeMirror*/ 32) {
						transition_in(if_block, 1);
					}
				} else {
					if_block = create_if_block$3(ctx);
					if_block.c();
					transition_in(if_block, 1);
					if_block.m(div, null);
				}
			} else if (if_block) {
				group_outros();

				transition_out(if_block, 1, 1, () => {
					if_block = null;
				});

				check_outros();
			}

			if (dirty & /*flex*/ 1) {
				toggle_class(div, "flex", /*flex*/ ctx[0]);
			}
		},
		i(local) {
			if (current) return;
			transition_in(if_block);
			current = true;
		},
		o(local) {
			transition_out(if_block);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(t0);
			if (detaching) detach(div);
			/*textarea_binding*/ ctx[18](null);
			if (if_block) if_block.d();
			div_resize_listener();
		}
	};
}

function sleep(ms) {
	return new Promise(fulfil => setTimeout(fulfil, ms));
}

function instance$6($$self, $$props, $$invalidate) {
	const dispatch = createEventDispatcher();
	let { readonly = false } = $$props;
	let { errorLoc = null } = $$props;
	let { flex = false } = $$props;
	let { lineNumbers = true } = $$props;
	let { tab = true } = $$props;
	let w;
	let h;
	let code = "";
	let mode;

	async function set(new_code, new_mode) {
		if (new_mode !== mode) {
			await createEditor(mode = new_mode);
		}

		$$invalidate(3, code = new_code);
		updating_externally = true;
		if (editor) editor.setValue(code);
		updating_externally = false;
	}

	function update(new_code) {
		$$invalidate(3, code = new_code);

		if (editor) {
			const { left, top } = editor.getScrollInfo();
			editor.setValue($$invalidate(3, code = new_code));
			editor.scrollTo(left, top);
		}
	}

	function resize() {
		editor.refresh();
	}

	function focus() {
		editor.focus();
	}

	const modes = {
		js: { name: "javascript", json: false },
		json: { name: "javascript", json: true },
		svelte: { name: "handlebars", base: "text/html" },
		svx: { name: "gfm" }
	};

	const refs = {};
	let editor;
	let updating_externally = false;
	let marker;
	let error_line;
	let destroyed = false;
	let CodeMirror;
	let previous_error_line;

	onMount(async () => {
		if (CodeMirror) {
			createEditor(mode || "svelte").then(() => {
				if (editor) editor.setValue(code || "");
			});
		} else {
			let mod = await Promise.resolve().then(function () { return require('./codemirror-ffa04635.cjs'); });
			$$invalidate(5, CodeMirror = mod.default);
			await createEditor(mode || "svelte");
			if (editor) editor.setValue(code || "");
		}

		return () => {
			destroyed = true;
			if (editor) editor.toTextArea();
		};
	});

	let first = true;

	async function createEditor(mode) {
		if (destroyed || !CodeMirror) return;
		if (editor) editor.toTextArea();

		const opts = {
			lineNumbers,
			lineWrapping: true,
			indentWithTabs: true,
			indentUnit: 2,
			tabSize: 2,
			value: "",
			mode: modes[mode] || { name: mode },
			readOnly: readonly,
			autoCloseBrackets: true,
			autoCloseTags: true
		};

		if (!tab) opts.extraKeys = { Tab: tab, "Shift-Tab": tab };

		// Creating a text editor is a lot of work, so we yield
		// the main thread for a moment. This helps reduce jank
		if (first) await sleep(50);

		if (destroyed) return;
		$$invalidate(14, editor = CodeMirror.fromTextArea(refs.editor, opts));

		editor.on("change", instance => {
			if (!updating_externally) {
				const value = instance.getValue();
				dispatch("change", { value });
			}
		});

		if (first) await sleep(50);
		editor.refresh();
		first = false;
	}

	function textarea_binding($$value) {
		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
			refs.editor = $$value;
			$$invalidate(4, refs);
		});
	}

	function div_elementresize_handler() {
		w = this.offsetWidth;
		h = this.offsetHeight;
		$$invalidate(1, w);
		$$invalidate(2, h);
	}

	$$self.$$set = $$props => {
		if ('readonly' in $$props) $$invalidate(6, readonly = $$props.readonly);
		if ('errorLoc' in $$props) $$invalidate(7, errorLoc = $$props.errorLoc);
		if ('flex' in $$props) $$invalidate(0, flex = $$props.flex);
		if ('lineNumbers' in $$props) $$invalidate(8, lineNumbers = $$props.lineNumbers);
		if ('tab' in $$props) $$invalidate(9, tab = $$props.tab);
	};

	$$self.$$.update = () => {
		if ($$self.$$.dirty & /*editor, w, h*/ 16390) {
			if (editor && w && h) {
				editor.refresh();
			}
		}

		if ($$self.$$.dirty & /*marker, errorLoc, editor*/ 49280) {
			{
				if (marker) marker.clear();

				if (errorLoc) {
					const line = errorLoc.line - 1;
					const ch = errorLoc.column;
					$$invalidate(15, marker = editor.markText({ line, ch }, { line, ch: ch + 1 }, { className: "error-loc" }));
					$$invalidate(16, error_line = line);
				} else {
					$$invalidate(16, error_line = null);
				}
			}
		}

		if ($$self.$$.dirty & /*editor, previous_error_line, error_line*/ 212992) {
			if (editor) {
				if (previous_error_line != null) {
					editor.removeLineClass(previous_error_line, "wrap", "error-line");
				}

				if (error_line && error_line !== previous_error_line) {
					editor.addLineClass(error_line, "wrap", "error-line");
					$$invalidate(17, previous_error_line = error_line);
				}
			}
		}
	};

	return [
		flex,
		w,
		h,
		code,
		refs,
		CodeMirror,
		readonly,
		errorLoc,
		lineNumbers,
		tab,
		set,
		update,
		resize,
		focus,
		editor,
		marker,
		error_line,
		previous_error_line,
		textarea_binding,
		div_elementresize_handler
	];
}

class CodeMirror_1 extends SvelteComponent {
	constructor(options) {
		super();

		init(this, options, instance$6, create_fragment$6, safe_not_equal, {
			readonly: 6,
			errorLoc: 7,
			flex: 0,
			lineNumbers: 8,
			tab: 9,
			set: 10,
			update: 11,
			resize: 12,
			focus: 13
		});
	}

	get set() {
		return this.$$.ctx[10];
	}

	get update() {
		return this.$$.ctx[11];
	}

	get resize() {
		return this.$$.ctx[12];
	}

	get focus() {
		return this.$$.ctx[13];
	}
}

/* src/lib/Repl/Input/ModuleEditor.svelte generated by Svelte v3.49.0 */

function get_each_context(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[10] = list[i];
	return child_ctx;
}

// (61:4) {#if $bundle}
function create_if_block$2(ctx) {
	let current_block_type_index;
	let if_block;
	let if_block_anchor;
	let current;
	const if_block_creators = [create_if_block_1$1, create_if_block_2];
	const if_blocks = [];

	function select_block_type(ctx, dirty) {
		if (/*$bundle*/ ctx[2].error) return 0;
		if (/*$bundle*/ ctx[2].warnings.length > 0) return 1;
		return -1;
	}

	if (~(current_block_type_index = select_block_type(ctx))) {
		if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
	}

	return {
		c() {
			if (if_block) if_block.c();
			if_block_anchor = empty();
		},
		m(target, anchor) {
			if (~current_block_type_index) {
				if_blocks[current_block_type_index].m(target, anchor);
			}

			insert(target, if_block_anchor, anchor);
			current = true;
		},
		p(ctx, dirty) {
			let previous_block_index = current_block_type_index;
			current_block_type_index = select_block_type(ctx);

			if (current_block_type_index === previous_block_index) {
				if (~current_block_type_index) {
					if_blocks[current_block_type_index].p(ctx, dirty);
				}
			} else {
				if (if_block) {
					group_outros();

					transition_out(if_blocks[previous_block_index], 1, 1, () => {
						if_blocks[previous_block_index] = null;
					});

					check_outros();
				}

				if (~current_block_type_index) {
					if_block = if_blocks[current_block_type_index];

					if (!if_block) {
						if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
						if_block.c();
					} else {
						if_block.p(ctx, dirty);
					}

					transition_in(if_block, 1);
					if_block.m(if_block_anchor.parentNode, if_block_anchor);
				} else {
					if_block = null;
				}
			}
		},
		i(local) {
			if (current) return;
			transition_in(if_block);
			current = true;
		},
		o(local) {
			transition_out(if_block);
			current = false;
		},
		d(detaching) {
			if (~current_block_type_index) {
				if_blocks[current_block_type_index].d(detaching);
			}

			if (detaching) detach(if_block_anchor);
		}
	};
}

// (67:44) 
function create_if_block_2(ctx) {
	let each_1_anchor;
	let current;
	let each_value = /*$bundle*/ ctx[2].warnings;
	let each_blocks = [];

	for (let i = 0; i < each_value.length; i += 1) {
		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
	}

	const out = i => transition_out(each_blocks[i], 1, 1, () => {
		each_blocks[i] = null;
	});

	return {
		c() {
			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].c();
			}

			each_1_anchor = empty();
		},
		m(target, anchor) {
			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].m(target, anchor);
			}

			insert(target, each_1_anchor, anchor);
			current = true;
		},
		p(ctx, dirty) {
			if (dirty & /*$bundle, $selected*/ 12) {
				each_value = /*$bundle*/ ctx[2].warnings;
				let i;

				for (i = 0; i < each_value.length; i += 1) {
					const child_ctx = get_each_context(ctx, each_value, i);

					if (each_blocks[i]) {
						each_blocks[i].p(child_ctx, dirty);
						transition_in(each_blocks[i], 1);
					} else {
						each_blocks[i] = create_each_block(child_ctx);
						each_blocks[i].c();
						transition_in(each_blocks[i], 1);
						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
					}
				}

				group_outros();

				for (i = each_value.length; i < each_blocks.length; i += 1) {
					out(i);
				}

				check_outros();
			}
		},
		i(local) {
			if (current) return;

			for (let i = 0; i < each_value.length; i += 1) {
				transition_in(each_blocks[i]);
			}

			current = true;
		},
		o(local) {
			each_blocks = each_blocks.filter(Boolean);

			for (let i = 0; i < each_blocks.length; i += 1) {
				transition_out(each_blocks[i]);
			}

			current = false;
		},
		d(detaching) {
			destroy_each(each_blocks, detaching);
			if (detaching) detach(each_1_anchor);
		}
	};
}

// (62:6) {#if $bundle.error}
function create_if_block_1$1(ctx) {
	let message;
	let current;

	message = new Message({
			props: {
				kind: "error",
				details: /*$bundle*/ ctx[2].error,
				filename: "" + (/*$selected*/ ctx[3].name + "." + /*$selected*/ ctx[3].type)
			}
		});

	return {
		c() {
			create_component(message.$$.fragment);
		},
		m(target, anchor) {
			mount_component(message, target, anchor);
			current = true;
		},
		p(ctx, dirty) {
			const message_changes = {};
			if (dirty & /*$bundle*/ 4) message_changes.details = /*$bundle*/ ctx[2].error;
			if (dirty & /*$selected*/ 8) message_changes.filename = "" + (/*$selected*/ ctx[3].name + "." + /*$selected*/ ctx[3].type);
			message.$set(message_changes);
		},
		i(local) {
			if (current) return;
			transition_in(message.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(message.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			destroy_component(message, detaching);
		}
	};
}

// (68:8) {#each $bundle.warnings as warning}
function create_each_block(ctx) {
	let message;
	let current;

	message = new Message({
			props: {
				kind: "warning",
				details: /*warning*/ ctx[10],
				filename: "" + (/*$selected*/ ctx[3].name + "." + /*$selected*/ ctx[3].type)
			}
		});

	return {
		c() {
			create_component(message.$$.fragment);
		},
		m(target, anchor) {
			mount_component(message, target, anchor);
			current = true;
		},
		p(ctx, dirty) {
			const message_changes = {};
			if (dirty & /*$bundle*/ 4) message_changes.details = /*warning*/ ctx[10];
			if (dirty & /*$selected*/ 8) message_changes.filename = "" + (/*$selected*/ ctx[3].name + "." + /*$selected*/ ctx[3].type);
			message.$set(message_changes);
		},
		i(local) {
			if (current) return;
			transition_in(message.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(message.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			destroy_component(message, detaching);
		}
	};
}

function create_fragment$5(ctx) {
	let div2;
	let div0;
	let codemirror;
	let t;
	let div1;
	let current;

	let codemirror_props = {
		errorLoc: /*errorLoc*/ ctx[0],
		lineNumbers: false
	};

	codemirror = new CodeMirror_1({ props: codemirror_props });
	/*codemirror_binding*/ ctx[8](codemirror);
	codemirror.$on("change", /*handle_change*/ ctx[6]);
	let if_block = /*$bundle*/ ctx[2] && create_if_block$2(ctx);

	return {
		c() {
			div2 = element("div");
			div0 = element("div");
			create_component(codemirror.$$.fragment);
			t = space();
			div1 = element("div");
			if (if_block) if_block.c();
			attr(div0, "class", "editor svelte-1x3die8");
			attr(div1, "class", "info svelte-1x3die8");
			attr(div2, "class", "editor-wrapper svelte-1x3die8");
		},
		m(target, anchor) {
			insert(target, div2, anchor);
			append(div2, div0);
			mount_component(codemirror, div0, null);
			append(div2, t);
			append(div2, div1);
			if (if_block) if_block.m(div1, null);
			current = true;
		},
		p(ctx, [dirty]) {
			const codemirror_changes = {};
			if (dirty & /*errorLoc*/ 1) codemirror_changes.errorLoc = /*errorLoc*/ ctx[0];
			codemirror.$set(codemirror_changes);

			if (/*$bundle*/ ctx[2]) {
				if (if_block) {
					if_block.p(ctx, dirty);

					if (dirty & /*$bundle*/ 4) {
						transition_in(if_block, 1);
					}
				} else {
					if_block = create_if_block$2(ctx);
					if_block.c();
					transition_in(if_block, 1);
					if_block.m(div1, null);
				}
			} else if (if_block) {
				group_outros();

				transition_out(if_block, 1, 1, () => {
					if_block = null;
				});

				check_outros();
			}
		},
		i(local) {
			if (current) return;
			transition_in(codemirror.$$.fragment, local);
			transition_in(if_block);
			current = true;
		},
		o(local) {
			transition_out(codemirror.$$.fragment, local);
			transition_out(if_block);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(div2);
			/*codemirror_binding*/ ctx[8](null);
			destroy_component(codemirror);
			if (if_block) if_block.d();
		}
	};
}

function instance$5($$self, $$props, $$invalidate) {
	let $bundle;
	let $selected;
	const { bundle, selected, handle_change, register_module_editor } = getContext("REPL");
	component_subscribe($$self, bundle, value => $$invalidate(2, $bundle = value));
	component_subscribe($$self, selected, value => $$invalidate(3, $selected = value));
	let { errorLoc } = $$props;
	let editor;

	onMount(() => {
		register_module_editor(editor);
	});

	function focus() {
		editor.focus();
	}

	function codemirror_binding($$value) {
		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
			editor = $$value;
			$$invalidate(1, editor);
		});
	}

	$$self.$$set = $$props => {
		if ('errorLoc' in $$props) $$invalidate(0, errorLoc = $$props.errorLoc);
	};

	return [
		errorLoc,
		editor,
		$bundle,
		$selected,
		bundle,
		selected,
		handle_change,
		focus,
		codemirror_binding
	];
}

class ModuleEditor extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, instance$5, create_fragment$5, safe_not_equal, { errorLoc: 0, focus: 7 });
	}

	get focus() {
		return this.$$.ctx[7];
	}
}

var charToInteger = {};
var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
for (var i = 0; i < chars.length; i++) {
    charToInteger[chars.charCodeAt(i)] = i;
}
function decode(mappings) {
    var decoded = [];
    var line = [];
    var segment = [
        0,
        0,
        0,
        0,
        0,
    ];
    var j = 0;
    for (var i = 0, shift = 0, value = 0; i < mappings.length; i++) {
        var c = mappings.charCodeAt(i);
        if (c === 44) { // ","
            segmentify(line, segment, j);
            j = 0;
        }
        else if (c === 59) { // ";"
            segmentify(line, segment, j);
            j = 0;
            decoded.push(line);
            line = [];
            segment[0] = 0;
        }
        else {
            var integer = charToInteger[c];
            if (integer === undefined) {
                throw new Error('Invalid character (' + String.fromCharCode(c) + ')');
            }
            var hasContinuationBit = integer & 32;
            integer &= 31;
            value += integer << shift;
            if (hasContinuationBit) {
                shift += 5;
            }
            else {
                var shouldNegate = value & 1;
                value >>>= 1;
                if (shouldNegate) {
                    value = value === 0 ? -0x80000000 : -value;
                }
                segment[j] += value;
                j++;
                value = shift = 0; // reset
            }
        }
    }
    segmentify(line, segment, j);
    decoded.push(line);
    return decoded;
}
function segmentify(line, segment, j) {
    // This looks ugly, but we're creating specialized arrays with a specific
    // length. This is much faster than creating a new array (which v8 expands to
    // a capacity of 17 after pushing the first item), or slicing out a subarray
    // (which is slow). Length 4 is assumed to be the most frequent, followed by
    // length 5 (since not everything will have an associated name), followed by
    // length 1 (it's probably rare for a source substring to not have an
    // associated segment data).
    if (j === 4)
        line.push([segment[0], segment[1], segment[2], segment[3]]);
    else if (j === 5)
        line.push([segment[0], segment[1], segment[2], segment[3], segment[4]]);
    else if (j === 1)
        line.push([segment[0]]);
}

function getLocationFromStack(stack, map) {
	if (!stack) return;
	const last = stack.split('\n')[1];
	const match = /<anonymous>:(\d+):(\d+)\)$/.exec(last);

	if (!match) return null;

	const line = +match[1];
	const column = +match[2];

	return trace({ line, column }, map);
}

function trace(loc, map) {
	const mappings = decode(map.mappings);
	const segments = mappings[loc.line - 1];

	for (let i = 0; i < segments.length; i += 1) {
		const segment = segments[i];
		if (segment[0] === loc.column) {
			const [, sourceIndex, line, column] = segment;
			const source = map.sources[sourceIndex].slice(2);

			return { source, line: line + 1, column };
		}
	}

	return null;
}

let uid$1 = 1;

class ReplProxy {
	constructor(iframe, handlers) {
		this.iframe = iframe;
		this.handlers = handlers;

		this.pending_cmds = new Map();

		this.handle_event = e => this.handle_repl_message(e);
		window.addEventListener('message', this.handle_event, false);
	}

	destroy() {
		window.removeEventListener('message', this.handle_event);
	}

	iframe_command(action, args) {
		return new Promise((resolve, reject) => {
			const cmd_id = uid$1++;

			this.pending_cmds.set(cmd_id, { resolve, reject });

			this.iframe.contentWindow.postMessage({ action, cmd_id, args }, '*');
		});
	}

	handle_command_message(cmd_data) {
		let action = cmd_data.action;
		let id = cmd_data.cmd_id;
		let handler = this.pending_cmds.get(id);

		if (handler) {
			this.pending_cmds.delete(id);
			if (action === 'cmd_error') {
				let { message, stack } = cmd_data;
				let e = new Error(message);
				e.stack = stack;
				handler.reject(e);
			}

			if (action === 'cmd_ok') {
				handler.resolve(cmd_data.args);
			}
		} else {
			console.error('command not found', id, cmd_data, [...this.pending_cmds.keys()]);
		}
	}

	handle_repl_message(event) {
		if (event.source !== this.iframe.contentWindow) return;

		const { action, args } = event.data;

		switch (action) {
			case 'cmd_error':
			case 'cmd_ok':
				return this.handle_command_message(event.data);
			case 'fetch_progress':
				return this.handlers.on_fetch_progress(args.remaining)
			case 'error':
				return this.handlers.on_error(event.data);
			case 'unhandledrejection':
				return this.handlers.on_unhandled_rejection(event.data);
			case 'console':
				return this.handlers.on_console(event.data);
		}
	}

	eval(script) {
		return this.iframe_command('eval', { script });
	}

	handle_links() {
		return this.iframe_command('catch_clicks', {});
	}
}

var srcdoc = "<!doctype html><html><head><style>html, body {position: relative;width: 100%;height: 100%;}body {color: #333;margin: 0;padding: 8px 20px;box-sizing: border-box;font-family: -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, Oxygen-Sans, Ubuntu, Cantarell, \"Helvetica Neue\", sans-serif;}a {color: rgb(0,100,200);text-decoration: none;}a:hover {text-decoration: underline;}a:visited {color: rgb(0,80,160);}label {display: block;}input, button, select, textarea {font-family: inherit;font-size: inherit;padding: 0.4em;margin: 0 0 0.5em 0;box-sizing: border-box;border: 1px solid #ccc;border-radius: 2px;}input:disabled {color: #ccc;}input[type=\"range\"] {height: 0;}button {color: #333;background-color: #f4f4f4;outline: none;}button:active {background-color: #ddd;}button:focus {border-color: #666;} p:last-child{margin-bottom: 30px;}</style><script>(function(){function handle_message(ev) {let { action, cmd_id } = ev.data;const send_message = (payload) => parent.postMessage( { ...payload }, ev.origin);const send_reply = (payload) => send_message({ ...payload, cmd_id });const send_ok = () => send_reply({ action: 'cmd_ok' });const send_error = (message, stack) => send_reply({ action: 'cmd_error', message, stack });if (action === 'eval') {try {const { script } = ev.data.args;eval(script);send_ok();} catch (e) {send_error(e.message, e.stack);}}if (action === 'catch_clicks') {try {const top_origin = ev.origin;document.body.addEventListener('click', event => {if (event.which !== 1) return;if (event.metaKey || event.ctrlKey || event.shiftKey) return;if (event.defaultPrevented) return;let el = event.target;while (el && el.nodeName !== 'A') el = el.parentNode;if (!el || el.nodeName !== 'A') return;if (el.hasAttribute('download') || el.getAttribute('rel') === 'external' || el.target) return;event.preventDefault();if (el.href.startsWith(top_origin)) {const url = new URL(el.href);if (url.hash[0] === '#') {window.location.hash = url.hash;return;}}window.open(el.href, '_blank');});send_ok();} catch(e) {send_error(e.message, e.stack);}}}window.addEventListener('message', handle_message, false);window.onerror = function (msg, url, lineNo, columnNo, error) {parent.postMessage({ action: 'error', value: error }, '*');};window.addEventListener(\"unhandledrejection\", event => {parent.postMessage({ action: 'unhandledrejection', value: event.reason }, '*');});}).call(this);let previous = { level: null, args: null };['clear', 'log', 'info', 'dir', 'warn', 'error'].forEach((level) => {const original = console[level];console[level] = (...args) => {if (previous.level === level &&previous.args.length === args.length &&previous.args.every((a, i) => a === args[i])) {parent.postMessage({ action: 'console', level, duplicate: true }, '*');} else {previous = { level, args };try {parent.postMessage({ action: 'console', level, args }, '*');} catch (err) {parent.postMessage({ action: 'console', level: 'unclonable' }, '*');}}original(...args);}})</script></head><body></body></html>";

/* src/lib/Repl/Output/Viewer.svelte generated by Svelte v3.49.0 */

function create_if_block_1(ctx) {
	let message;
	let current;

	message = new Message({
			props: {
				kind: "info",
				truncate: true,
				$$slots: { default: [create_default_slot] },
				$$scope: { ctx }
			}
		});

	return {
		c() {
			create_component(message.$$.fragment);
		},
		m(target, anchor) {
			mount_component(message, target, anchor);
			current = true;
		},
		p(ctx, dirty) {
			const message_changes = {};

			if (dirty & /*$$scope, status*/ 16777218) {
				message_changes.$$scope = { dirty, ctx };
			}

			message.$set(message_changes);
		},
		i(local) {
			if (current) return;
			transition_in(message.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(message.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			destroy_component(message, detaching);
		}
	};
}

// (213:4) {#if error}
function create_if_block$1(ctx) {
	let message;
	let current;

	message = new Message({
			props: { kind: "error", details: /*error*/ ctx[0] }
		});

	return {
		c() {
			create_component(message.$$.fragment);
		},
		m(target, anchor) {
			mount_component(message, target, anchor);
			current = true;
		},
		p(ctx, dirty) {
			const message_changes = {};
			if (dirty & /*error*/ 1) message_changes.details = /*error*/ ctx[0];
			message.$set(message_changes);
		},
		i(local) {
			if (current) return;
			transition_in(message.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(message.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			destroy_component(message, detaching);
		}
	};
}

// (216:6) <Message kind="info" truncate>
function create_default_slot(ctx) {
	let t_value = (/*status*/ ctx[1] || 'loading Svelte compiler...') + "";
	let t;

	return {
		c() {
			t = text(t_value);
		},
		m(target, anchor) {
			insert(target, t, anchor);
		},
		p(ctx, dirty) {
			if (dirty & /*status*/ 2 && t_value !== (t_value = (/*status*/ ctx[1] || 'loading Svelte compiler...') + "")) set_data(t, t_value);
		},
		d(detaching) {
			if (detaching) detach(t);
		}
	};
}

function create_fragment$4(ctx) {
	let div2;
	let div0;
	let iframe_1;
	let iframe_1_sandbox_value;
	let iframe_1_class_value;
	let t;
	let div1;
	let current_block_type_index;
	let if_block;
	let current;
	const if_block_creators = [create_if_block$1, create_if_block_1];
	const if_blocks = [];

	function select_block_type(ctx, dirty) {
		if (/*error*/ ctx[0]) return 0;
		if (/*status*/ ctx[1] || !/*$bundle*/ ctx[3]) return 1;
		return -1;
	}

	if (~(current_block_type_index = select_block_type(ctx))) {
		if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
	}

	return {
		c() {
			div2 = element("div");
			div0 = element("div");
			iframe_1 = element("iframe");
			t = space();
			div1 = element("div");
			if (if_block) if_block.c();
			attr(iframe_1, "title", "Result");
			attr(iframe_1, "sandbox", iframe_1_sandbox_value = "allow-popups-to-escape-sandbox allow-scripts allow-popups\n      allow-forms allow-pointer-lock allow-top-navigation allow-modals " + (/*relaxed*/ ctx[2] ? 'allow-same-origin' : ''));

			attr(iframe_1, "class", iframe_1_class_value = "" + (null_to_empty(/*error*/ ctx[0] || pending || /*pending_imports*/ ctx[5]
			? 'greyed-out'
			: '') + " svelte-1n49w9s"));

			attr(iframe_1, "srcdoc", srcdoc);
			toggle_class(iframe_1, "inited", /*inited*/ ctx[6]);
			set_style(div0, "height", "100%");
			attr(div1, "class", "overlay svelte-1n49w9s");
			attr(div2, "class", "iframe-container svelte-1n49w9s");
		},
		m(target, anchor) {
			insert(target, div2, anchor);
			append(div2, div0);
			append(div0, iframe_1);
			/*iframe_1_binding*/ ctx[12](iframe_1);
			append(div2, t);
			append(div2, div1);

			if (~current_block_type_index) {
				if_blocks[current_block_type_index].m(div1, null);
			}

			current = true;
		},
		p(ctx, [dirty]) {
			if (!current || dirty & /*relaxed*/ 4 && iframe_1_sandbox_value !== (iframe_1_sandbox_value = "allow-popups-to-escape-sandbox allow-scripts allow-popups\n      allow-forms allow-pointer-lock allow-top-navigation allow-modals " + (/*relaxed*/ ctx[2] ? 'allow-same-origin' : ''))) {
				attr(iframe_1, "sandbox", iframe_1_sandbox_value);
			}

			if (!current || dirty & /*error, pending_imports*/ 33 && iframe_1_class_value !== (iframe_1_class_value = "" + (null_to_empty(/*error*/ ctx[0] || pending || /*pending_imports*/ ctx[5]
			? 'greyed-out'
			: '') + " svelte-1n49w9s"))) {
				attr(iframe_1, "class", iframe_1_class_value);
			}

			if (dirty & /*error, pending_imports, inited*/ 97) {
				toggle_class(iframe_1, "inited", /*inited*/ ctx[6]);
			}

			let previous_block_index = current_block_type_index;
			current_block_type_index = select_block_type(ctx);

			if (current_block_type_index === previous_block_index) {
				if (~current_block_type_index) {
					if_blocks[current_block_type_index].p(ctx, dirty);
				}
			} else {
				if (if_block) {
					group_outros();

					transition_out(if_blocks[previous_block_index], 1, 1, () => {
						if_blocks[previous_block_index] = null;
					});

					check_outros();
				}

				if (~current_block_type_index) {
					if_block = if_blocks[current_block_type_index];

					if (!if_block) {
						if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
						if_block.c();
					} else {
						if_block.p(ctx, dirty);
					}

					transition_in(if_block, 1);
					if_block.m(div1, null);
				} else {
					if_block = null;
				}
			}
		},
		i(local) {
			if (current) return;
			transition_in(if_block);
			current = true;
		},
		o(local) {
			transition_out(if_block);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(div2);
			/*iframe_1_binding*/ ctx[12](null);

			if (~current_block_type_index) {
				if_blocks[current_block_type_index].d();
			}
		}
	};
}

let pending = false;

function instance$4($$self, $$props, $$invalidate) {
	let styles;
	let $bundle;
	const { bundle } = getContext("REPL");
	component_subscribe($$self, bundle, value => $$invalidate(3, $bundle = value));
	let { error } = $$props;
	let logs = [];

	function setProp(prop, value) {
		if (!proxy) return;
		proxy.setProp(prop, value);
	}

	let { status } = $$props;
	let { relaxed = false } = $$props;
	let { injectedJS = "" } = $$props;
	let { injectedCSS = "" } = $$props;
	let iframe;
	let pending_imports = 0;
	let proxy = null;
	let ready = false;
	let inited = false;
	let last_console_event;

	onMount(() => {
		proxy = new ReplProxy(iframe,
		{
				on_fetch_progress: progress => {
					$$invalidate(5, pending_imports = progress);
				},
				on_error: event => {
					push_logs({ level: "error", args: [event.value] });
				},
				on_unhandled_rejection: event => {
					let error = event.value;
					if (typeof error === "string") error = { message: error };
					error.message = "Uncaught (in promise): " + error.message;
					push_logs({ level: "error", args: [error] });
				},
				on_console: log => {
					if (log.level === "clear") {
						logs = [log];
					} else if (log.duplicate) {
						const last_log = logs[logs.length - 1];

						if (last_log) {
							last_log.count = (last_log.count || 1) + 1;
							logs = logs;
						} else {
							last_console_event.count = 1;
							logs = [last_console_event];
						}
					} else {
						push_logs(log);
						last_console_event = log;
					}
				}
			});

		iframe.addEventListener("load", () => {
			proxy.handle_links();
			$$invalidate(11, ready = true);
		});

		return () => {
			proxy.destroy();
		};
	});

	async function apply_bundle($bundle) {
		if (!$bundle || $bundle.error) return;

		try {
			clear_logs();

			await proxy.eval(`
				${injectedJS}

				${styles}

				const styles = document.querySelectorAll('style[id^=svelte-]');

				${$bundle.dom.code}

				let i = styles.length;
				while (i--) styles[i].parentNode.removeChild(styles[i]);

				if (window.component) {
					try {
						window.component.$destroy();
					} catch (err) {
						console.error(err);
					}
				}

				document.body.innerHTML = '';
				window.location.hash = '';
				window._svelteTransitionManager = null;

				window.component = new SvelteComponent.default({
					target: document.body
				});
			`);

			$$invalidate(0, error = null);
		} catch(e) {
			show_error(e);
		}

		$$invalidate(6, inited = true);
	}

	function show_error(e) {
		const loc = getLocationFromStack(e.stack, $bundle.dom.map);

		if (loc) {
			e.filename = loc.source;
			e.loc = { line: loc.line, column: loc.column };
		}

		$$invalidate(0, error = e);
	}

	function push_logs(log) {
		logs = [...logs, log];
	}

	function clear_logs() {
		logs = [];
	}

	function iframe_1_binding($$value) {
		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
			iframe = $$value;
			$$invalidate(4, iframe);
		});
	}

	$$self.$$set = $$props => {
		if ('error' in $$props) $$invalidate(0, error = $$props.error);
		if ('status' in $$props) $$invalidate(1, status = $$props.status);
		if ('relaxed' in $$props) $$invalidate(2, relaxed = $$props.relaxed);
		if ('injectedJS' in $$props) $$invalidate(9, injectedJS = $$props.injectedJS);
		if ('injectedCSS' in $$props) $$invalidate(10, injectedCSS = $$props.injectedCSS);
	};

	$$self.$$.update = () => {
		if ($$self.$$.dirty & /*ready, $bundle*/ 2056) {
			if (ready) apply_bundle($bundle);
		}

		if ($$self.$$.dirty & /*injectedCSS*/ 1024) {
			styles = injectedCSS && `{
		const style = document.createElement('style');
		style.textContent = ${JSON.stringify(injectedCSS)};
		document.head.appendChild(style);
	}`;
		}
	};

	return [
		error,
		status,
		relaxed,
		$bundle,
		iframe,
		pending_imports,
		inited,
		bundle,
		setProp,
		injectedJS,
		injectedCSS,
		ready,
		iframe_1_binding
	];
}

class Viewer extends SvelteComponent {
	constructor(options) {
		super();

		init(this, options, instance$4, create_fragment$4, safe_not_equal, {
			error: 0,
			setProp: 8,
			status: 1,
			relaxed: 2,
			injectedJS: 9,
			injectedCSS: 10
		});
	}

	get setProp() {
		return this.$$.ctx[8];
	}
}

const workers = new Map();

let uid = 1;

class Compiler {
	constructor(workersUrl, svelteUrl) {
		if (!workers.has(svelteUrl)) {
			const worker = new Worker(`${workersUrl}/compiler.js`);
			worker.postMessage({ type: 'init', svelteUrl });
			workers.set(svelteUrl, worker);
		}

		this.worker = workers.get(svelteUrl);

		this.handlers = new Map();

		this.worker.addEventListener('message', event => {
			const handler = this.handlers.get(event.data.id);

			if (handler) { // if no handler, was meant for a different REPL
				handler(event.data.result);
				this.handlers.delete(event.data.id);
			}
		});
	}

	compile(component, options) {
		return new Promise(fulfil => {
			const id = uid++;

			this.handlers.set(id, fulfil);

			this.worker.postMessage({
				id,
				type: 'compile',
				source: component.source,
				options: Object.assign({
					name: component.name,
					filename: `${component.name}.svelte`
				}, options),
				entry: component.name === 'App'
			});
		});
	}

	destroy() {
		this.worker.terminate();
	}
}

const is_browser = typeof window !== 'undefined';

/* src/lib/Repl/Output/index.svelte generated by Svelte v3.49.0 */

function create_fragment$3(ctx) {
	let div;
	let viewer_1;
	let updating_error;
	let current;

	function viewer_1_error_binding(value) {
		/*viewer_1_error_binding*/ ctx[10](value);
	}

	let viewer_1_props = {
		status: /*status*/ ctx[2],
		relaxed: /*relaxed*/ ctx[3],
		injectedJS: /*injectedJS*/ ctx[4],
		injectedCSS: /*injectedCSS*/ ctx[1]
	};

	if (/*runtimeError*/ ctx[0] !== void 0) {
		viewer_1_props.error = /*runtimeError*/ ctx[0];
	}

	viewer_1 = new Viewer({ props: viewer_1_props });
	/*viewer_1_binding*/ ctx[9](viewer_1);
	binding_callbacks.push(() => bind(viewer_1, 'error', viewer_1_error_binding));

	return {
		c() {
			div = element("div");
			create_component(viewer_1.$$.fragment);
			attr(div, "class", "tab-content svelte-1vwhaj2");
			toggle_class(div, "visible", view === 'result');
		},
		m(target, anchor) {
			insert(target, div, anchor);
			mount_component(viewer_1, div, null);
			current = true;
		},
		p(ctx, [dirty]) {
			const viewer_1_changes = {};
			if (dirty & /*status*/ 4) viewer_1_changes.status = /*status*/ ctx[2];
			if (dirty & /*relaxed*/ 8) viewer_1_changes.relaxed = /*relaxed*/ ctx[3];
			if (dirty & /*injectedJS*/ 16) viewer_1_changes.injectedJS = /*injectedJS*/ ctx[4];
			if (dirty & /*injectedCSS*/ 2) viewer_1_changes.injectedCSS = /*injectedCSS*/ ctx[1];

			if (!updating_error && dirty & /*runtimeError*/ 1) {
				updating_error = true;
				viewer_1_changes.error = /*runtimeError*/ ctx[0];
				add_flush_callback(() => updating_error = false);
			}

			viewer_1.$set(viewer_1_changes);
		},
		i(local) {
			if (current) return;
			transition_in(viewer_1.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(viewer_1.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(div);
			/*viewer_1_binding*/ ctx[9](null);
			destroy_component(viewer_1);
		}
	};
}

let view = "result";

function instance$3($$self, $$props, $$invalidate) {
	const { register_output } = getContext("REPL");
	let { svelteUrl } = $$props;
	let { workersUrl } = $$props;
	let { status } = $$props;
	let { runtimeError = null } = $$props;
	let { relaxed = false } = $$props;
	let { injectedJS } = $$props;
	let { injectedCSS } = $$props;
	let { funky = false } = $$props;
	injectedCSS = `code[class*=language-],pre[class*=language-]{color:#657b83;font-family:Consolas,Monaco,'Andale Mono','Ubuntu Mono',monospace;font-size:0.9em;text-align:left;white-space:pre;word-spacing:normal;word-break:normal;word-wrap:normal;line-height:1.5;-moz-tab-size:4;-o-tab-size:4;tab-size:4;-webkit-hyphens:none;-moz-hyphens:none;-ms-hyphens:none;hyphens:none}code[class*=language-] ::-moz-selection,code[class*=language-]::-moz-selection,pre[class*=language-] ::-moz-selection,pre[class*=language-]::-moz-selection{background:#073642}code[class*=language-] ::selection,code[class*=language-]::selection,pre[class*=language-] ::selection,pre[class*=language-]::selection{background:#073642}pre[class*=language-]{padding:1em;margin:.5em 0;overflow:auto;border-radius:.3em}:not(pre)>code[class*=language-],pre[class*=language-]{background-color:#fdf6e3}:not(pre)>code[class*=language-]{padding:.1em;border-radius:.3em}.token.cdata,.token.comment,.token.doctype,.token.prolog{color:#93a1a1}.token.punctuation{color:#586e75}.token.namespace{opacity:.7}.token.boolean,.token.constant,.token.deleted,.token.number,.token.property,.token.symbol,.token.tag{color:#268bd2}.token.attr-name,.token.builtin,.token.char,.token.inserted,.token.selector,.token.string,.token.url{color:#2aa198}.token.entity{color:#657b83;background:#eee8d5}.token.atrule,.token.attr-value,.token.keyword{color:#859900}.token.class-name,.token.function{color:#b58900}.token.important,.token.regex,.token.variable{color:#cb4b16}.token.bold,.token.important{font-weight:700}.token.italic{font-style:italic}.token.entity{cursor:help}`;

	register_output({
		set: async (selected, options) => {
			if (selected.type === "js") {
				js_editor.set(`/* Select a component to see its compiled code */`);
				css_editor.set(`/* Select a component to see its compiled code */`);
				return;
			}

			const compiled = await compiler.compile(selected, options);
			if (!js_editor) return; // unmounted
			js_editor.set(compiled.js, "js");
			css_editor.set(compiled.css, "css");
		},
		update: async (selected, options) => {
			if (selected.type === "js") return;
			const compiled = await compiler.compile(selected, options);
			if (!js_editor) return; // unmounted
			js_editor.update(compiled.js);
			css_editor.update(compiled.css);
		}
	});

	const compiler = is_browser && new Compiler(workersUrl, svelteUrl);

	// refs
	let viewer;

	let js_editor;
	let css_editor;

	function viewer_1_binding($$value) {
		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
			viewer = $$value;
			$$invalidate(5, viewer);
		});
	}

	function viewer_1_error_binding(value) {
		runtimeError = value;
		$$invalidate(0, runtimeError);
	}

	$$self.$$set = $$props => {
		if ('svelteUrl' in $$props) $$invalidate(6, svelteUrl = $$props.svelteUrl);
		if ('workersUrl' in $$props) $$invalidate(7, workersUrl = $$props.workersUrl);
		if ('status' in $$props) $$invalidate(2, status = $$props.status);
		if ('runtimeError' in $$props) $$invalidate(0, runtimeError = $$props.runtimeError);
		if ('relaxed' in $$props) $$invalidate(3, relaxed = $$props.relaxed);
		if ('injectedJS' in $$props) $$invalidate(4, injectedJS = $$props.injectedJS);
		if ('injectedCSS' in $$props) $$invalidate(1, injectedCSS = $$props.injectedCSS);
		if ('funky' in $$props) $$invalidate(8, funky = $$props.funky);
	};

	return [
		runtimeError,
		injectedCSS,
		status,
		relaxed,
		injectedJS,
		viewer,
		svelteUrl,
		workersUrl,
		funky,
		viewer_1_binding,
		viewer_1_error_binding
	];
}

class Output extends SvelteComponent {
	constructor(options) {
		super();

		init(this, options, instance$3, create_fragment$3, safe_not_equal, {
			svelteUrl: 6,
			workersUrl: 7,
			status: 2,
			runtimeError: 0,
			relaxed: 3,
			injectedJS: 4,
			injectedCSS: 1,
			funky: 8
		});
	}
}

/* src/lib/Repl/Repl.svelte generated by Svelte v3.49.0 */

function create_a_slot(ctx) {
	let section;
	let componentselector;
	let t;
	let moduleeditor;
	let current;

	componentselector = new ComponentSelector({
			props: {
				handle_select: /*handle_select*/ ctx[14],
				funky: /*funky*/ ctx[8]
			}
		});

	let moduleeditor_props = {
		errorLoc: /*sourceErrorLoc*/ ctx[15] || /*runtimeErrorLoc*/ ctx[16]
	};

	moduleeditor = new ModuleEditor({ props: moduleeditor_props });
	/*moduleeditor_binding*/ ctx[24](moduleeditor);

	return {
		c() {
			section = element("section");
			create_component(componentselector.$$.fragment);
			t = space();
			create_component(moduleeditor.$$.fragment);
			attr(section, "slot", "a");
			attr(section, "class", "svelte-u25bem");
			toggle_class(section, "funky", /*funky*/ ctx[8]);
		},
		m(target, anchor) {
			insert(target, section, anchor);
			mount_component(componentselector, section, null);
			append(section, t);
			mount_component(moduleeditor, section, null);
			current = true;
		},
		p(ctx, dirty) {
			const componentselector_changes = {};
			if (dirty[0] & /*funky*/ 256) componentselector_changes.funky = /*funky*/ ctx[8];
			componentselector.$set(componentselector_changes);
			const moduleeditor_changes = {};
			moduleeditor.$set(moduleeditor_changes);

			if (dirty[0] & /*funky*/ 256) {
				toggle_class(section, "funky", /*funky*/ ctx[8]);
			}
		},
		i(local) {
			if (current) return;
			transition_in(componentselector.$$.fragment, local);
			transition_in(moduleeditor.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(componentselector.$$.fragment, local);
			transition_out(moduleeditor.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(section);
			destroy_component(componentselector);
			/*moduleeditor_binding*/ ctx[24](null);
			destroy_component(moduleeditor);
		}
	};
}

// (243:4) 
function create_b_slot(ctx) {
	let section;
	let output_1;
	let current;

	output_1 = new Output({
			props: {
				funky: /*funky*/ ctx[8],
				svelteUrl: /*svelteUrl*/ ctx[2],
				workersUrl: /*workersUrl*/ ctx[1],
				status,
				relaxed: /*relaxed*/ ctx[4],
				injectedJS: /*injectedJS*/ ctx[7],
				injectedCSS: /*injectedCSS*/ ctx[0]
			}
		});

	return {
		c() {
			section = element("section");
			create_component(output_1.$$.fragment);
			attr(section, "slot", "b");
			attr(section, "class", "svelte-u25bem");
		},
		m(target, anchor) {
			insert(target, section, anchor);
			mount_component(output_1, section, null);
			current = true;
		},
		p(ctx, dirty) {
			const output_1_changes = {};
			if (dirty[0] & /*funky*/ 256) output_1_changes.funky = /*funky*/ ctx[8];
			if (dirty[0] & /*svelteUrl*/ 4) output_1_changes.svelteUrl = /*svelteUrl*/ ctx[2];
			if (dirty[0] & /*workersUrl*/ 2) output_1_changes.workersUrl = /*workersUrl*/ ctx[1];
			if (dirty[0] & /*relaxed*/ 16) output_1_changes.relaxed = /*relaxed*/ ctx[4];
			if (dirty[0] & /*injectedJS*/ 128) output_1_changes.injectedJS = /*injectedJS*/ ctx[7];
			if (dirty[0] & /*injectedCSS*/ 1) output_1_changes.injectedCSS = /*injectedCSS*/ ctx[0];
			output_1.$set(output_1_changes);
		},
		i(local) {
			if (current) return;
			transition_in(output_1.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(output_1.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(section);
			destroy_component(output_1);
		}
	};
}

function create_fragment$2(ctx) {
	let div;
	let splitpane;
	let current;

	splitpane = new SplitPane({
			props: {
				type: /*orientation*/ ctx[3] === 'rows'
				? 'vertical'
				: 'horizontal',
				pos: /*fixed*/ ctx[5]
				? /*fixedPos*/ ctx[6]
				: /*orientation*/ ctx[3] === 'rows' ? 50 : 50,
				fixed: /*fixed*/ ctx[5],
				$$slots: { b: [create_b_slot], a: [create_a_slot] },
				$$scope: { ctx }
			}
		});

	return {
		c() {
			div = element("div");
			create_component(splitpane.$$.fragment);
			attr(div, "class", "container svelte-u25bem");
			toggle_class(div, "orientation", /*orientation*/ ctx[3]);
		},
		m(target, anchor) {
			insert(target, div, anchor);
			mount_component(splitpane, div, null);
			current = true;
		},
		p(ctx, dirty) {
			const splitpane_changes = {};

			if (dirty[0] & /*orientation*/ 8) splitpane_changes.type = /*orientation*/ ctx[3] === 'rows'
			? 'vertical'
			: 'horizontal';

			if (dirty[0] & /*fixed, fixedPos, orientation*/ 104) splitpane_changes.pos = /*fixed*/ ctx[5]
			? /*fixedPos*/ ctx[6]
			: /*orientation*/ ctx[3] === 'rows' ? 50 : 50;

			if (dirty[0] & /*fixed*/ 32) splitpane_changes.fixed = /*fixed*/ ctx[5];

			if (dirty[0] & /*funky, svelteUrl, workersUrl, relaxed, injectedJS, injectedCSS, input*/ 919 | dirty[1] & /*$$scope*/ 16) {
				splitpane_changes.$$scope = { dirty, ctx };
			}

			splitpane.$set(splitpane_changes);

			if (dirty[0] & /*orientation*/ 8) {
				toggle_class(div, "orientation", /*orientation*/ ctx[3]);
			}
		},
		i(local) {
			if (current) return;
			transition_in(splitpane.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(splitpane.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(div);
			destroy_component(splitpane);
		}
	};
}

let status = null;

function instance$2($$self, $$props, $$invalidate) {
	let $compile_options;
	let $selected;
	let $components;
	let $bundle;
	let { workersUrl } = $$props;
	let { packagesUrl = "https://unpkg.com" } = $$props;
	let { svelteUrl = `${packagesUrl}/svelte` } = $$props;
	let { orientation = "columns" } = $$props;
	let { relaxed = false } = $$props;
	let { fixed = false } = $$props;
	let { fixedPos = 50 } = $$props;
	let { injectedJS = "" } = $$props;
	let { injectedCSS = "" } = $$props;
	let { funky = false } = $$props;

	function toJSON() {
		return {
			imports: $bundle.imports,
			components: $components
		};
	}

	async function set(data) {
		components.set(data.components);
		selected.set(data.components[0]);
		rebundle();
		await module_editor_ready;
		await output_ready;
		$$invalidate(0, injectedCSS = data.css || "");
		module_editor.set($selected.source, $selected.type);
		output.set($selected, $compile_options);
	}

	function update(data) {
		const { name, type } = $selected || {};
		components.set(data.components);
		const matched_component = data.components.find(file => file.name === name && file.type === type);
		selected.set(matched_component || data.components[0]);
		$$invalidate(0, injectedCSS = data.css || "");

		if (matched_component) {
			module_editor.update(matched_component.source);
			output.update(matched_component, $compile_options);
		} else {
			module_editor.set(matched_component.source, matched_component.type);
			output.set(matched_component, $compile_options);
		}
	}

	if (!workersUrl) {
		throw new Error(`You must supply workersUrl prop to <Repl>`);
	}

	const dispatch = createEventDispatcher();
	const components = writable([]);
	component_subscribe($$self, components, value => $$invalidate(29, $components = value));
	const selected = writable(null);
	component_subscribe($$self, selected, value => $$invalidate(23, $selected = value));
	const bundle = writable(null);
	component_subscribe($$self, bundle, value => $$invalidate(30, $bundle = value));

	const compile_options = writable({
		generate: "dom",
		dev: false,
		css: false,
		hydratable: false,
		customElement: false,
		immutable: false,
		legacy: false
	});

	component_subscribe($$self, compile_options, value => $$invalidate(22, $compile_options = value));
	let module_editor;
	let output;

	async function rebundle() {
	} // const result = await bundler.bundle($components);
	// if (result && token === current_token) bundle.set(result);

	// TODO this is a horrible kludge, written in a panic. fix it
	let fulfil_module_editor_ready;

	let module_editor_ready = new Promise(f => fulfil_module_editor_ready = f);
	let fulfil_output_ready;
	let output_ready = new Promise(f => fulfil_output_ready = f);

	setContext("REPL", {
		components,
		selected,
		bundle,
		compile_options,
		rebundle,
		navigate: item => {
			const match = (/^(.+)\.(\w+)$/).exec(item.filename);
			if (!match) return; // ???
			const [,name, type] = match;
			const component = $components.find(c => c.name === name && c.type === type);
			handle_select(component);
		}, // TODO select the line/column in question
		handle_change: event => {
			selected.update(component => {
				// TODO this is a bit hacky — we're relying on mutability
				// so that updating components works... might be better
				// if a) components had unique IDs, b) we tracked selected
				// *index* rather than component, and c) `selected` was
				// derived from `components` and `index`
				component.source = event.detail.value;

				return component;
			});

			components.update(c => c);
			output.update($selected, $compile_options);
			rebundle();
			dispatch("change", { components: $components });
		},
		register_module_editor(editor) {
			module_editor = editor;
			fulfil_module_editor_ready();
		},
		register_output(handlers) {
			$$invalidate(21, output = handlers);
			fulfil_output_ready();
		},
		request_focus() {
			module_editor.focus();
		}
	});

	function handle_select(component) {
		selected.set(component);
		module_editor.set(component.source, component.type);
		output.set($selected, $compile_options);
	}

	let input;
	let sourceErrorLoc;
	let runtimeErrorLoc; // TODO refactor this stuff — runtimeErrorLoc is unused

	function moduleeditor_binding($$value) {
		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
			input = $$value;
			$$invalidate(9, input);
		});
	}

	$$self.$$set = $$props => {
		if ('workersUrl' in $$props) $$invalidate(1, workersUrl = $$props.workersUrl);
		if ('packagesUrl' in $$props) $$invalidate(17, packagesUrl = $$props.packagesUrl);
		if ('svelteUrl' in $$props) $$invalidate(2, svelteUrl = $$props.svelteUrl);
		if ('orientation' in $$props) $$invalidate(3, orientation = $$props.orientation);
		if ('relaxed' in $$props) $$invalidate(4, relaxed = $$props.relaxed);
		if ('fixed' in $$props) $$invalidate(5, fixed = $$props.fixed);
		if ('fixedPos' in $$props) $$invalidate(6, fixedPos = $$props.fixedPos);
		if ('injectedJS' in $$props) $$invalidate(7, injectedJS = $$props.injectedJS);
		if ('injectedCSS' in $$props) $$invalidate(0, injectedCSS = $$props.injectedCSS);
		if ('funky' in $$props) $$invalidate(8, funky = $$props.funky);
	};

	$$self.$$.update = () => {
		if ($$self.$$.dirty[0] & /*output, $selected, $compile_options*/ 14680064) {
			// is_browser &&
			// new Bundler({
			//   workersUrl,
			//   packagesUrl,
			//   svelteUrl,
			//   onstatus: (message) => {
			//     status = message;
			//   },
			// });
			if (output && $selected) {
				output.update($selected, $compile_options);
			}
		}
	};

	return [
		injectedCSS,
		workersUrl,
		svelteUrl,
		orientation,
		relaxed,
		fixed,
		fixedPos,
		injectedJS,
		funky,
		input,
		components,
		selected,
		bundle,
		compile_options,
		handle_select,
		sourceErrorLoc,
		runtimeErrorLoc,
		packagesUrl,
		toJSON,
		set,
		update,
		output,
		$compile_options,
		$selected,
		moduleeditor_binding
	];
}

class Repl extends SvelteComponent {
	constructor(options) {
		super();

		init(
			this,
			options,
			instance$2,
			create_fragment$2,
			safe_not_equal,
			{
				workersUrl: 1,
				packagesUrl: 17,
				svelteUrl: 2,
				orientation: 3,
				relaxed: 4,
				fixed: 5,
				fixedPos: 6,
				injectedJS: 7,
				injectedCSS: 0,
				funky: 8,
				toJSON: 18,
				set: 19,
				update: 20
			},
			null,
			[-1, -1]
		);
	}

	get toJSON() {
		return this.$$.ctx[18];
	}

	get set() {
		return this.$$.ctx[19];
	}

	get update() {
		return this.$$.ctx[20];
	}
}

const code_1 = `---
title: Svex up your markdown
count: 25
color: cadetblue
list: [1, 2, 3, 4, "boo"]

---

<script>
	import Boinger from './Boinger.svelte';
	import Section from './Section.svx';
	import Count from './Count.svelte';
  import Seriously from './Seriously.svelte';

	let number = 45;
</script>

# { title }

## Good stuff in your markdown

Markdown is pretty good but sometimes you just need more.

Sometimes you need a boinger like this:

<Boinger color="{ color }"/>

Not many people have a boinger right in their markdown.

## Markdown in your markdown

Sometimes what you wrote last week is so good that you just *have* to include it again.

I'm not gonna stand in the way of your egomania.
>
><Section />
> <Count />
>
>— *Me, May 2019*

Yeah, thats right you can put wigdets in markdown (\`.svx\` files or otherwise). You can put markdown in widgets too.

<Seriously>

### I wasn't joking

\`\`\`
	This is real life
\`\`\`

</Seriously>

Sometimes you need your widgets **inlined** (like this:<Count count="{number}"/>) because why shouldn't you.
Obviously you have access to values defined in YAML (namespaced under \`metadata\`) and anything defined in an fenced \`js exec\` block can be referenced directly.

Normal markdown stuff works too:

| like  | this |
|-------|------|
| table | here |

And *this* and **THIS**. And other stuff. You can also use all your favorite Svelte features, like \`each\` blocks:

<ul>
{#each list as item}
  <li>{item}</li>
{/each}
</ul>

and all the other good Svelte stuff.

`;

const code_2 = `
<script>
	import { flip } from 'svelte/animate';
  import { crossfade, scale } from 'svelte/transition';

	export let color = 'pink';

  const [send, receive] = crossfade({fallback: scale})

  let boingers = [
		{val: 1, boinged: true},
		{val: 2, boinged: true},
		{val: 3, boinged: false},
		{val: 4, boinged: true},
		{val: 5, boinged: false}
	];

  function toggleBoing (id){
		const index = boingers.findIndex(v => v.val === id);
		boingers[index].boinged = !boingers[index].boinged
	}
<\/script>

<div class="container">

	<div class="boingers">
		{#each boingers.filter(v => !v.boinged) as {val} (val)}
			<div animate:flip
					 in:receive="{{key: val}}"
					 out:send="{{key: val}}"
					 style="background:{color};"
					 on:click="{() => toggleBoing(val)}">{val}</div>
		{/each}
  </div>

	<div class="boingers">
		{#each boingers.filter(v => v.boinged) as {val} (val)}
			<div animate:flip
					 in:receive="{{key: val}}"
					 out:send="{{key: val}}"
					 style="background:{color};"
					 on:click="{() => toggleBoing(val)}">{val}</div>
		{/each}
  </div>

</div>

<style>
	.container {
		width: 300px;
		height: 200px;
		display: flex;
		justify-content: space-between;
  }

	.boingers {
		display: grid;
		grid-template-rows: repeat(3, 1fr);
		grid-template-columns: repeat(2, 1fr);
		grid-gap: 10px;
  }

	.boingers div {
		width: 50px;
		height: 50px;
		display: flex;
		justify-content: center;
		align-items: center;
		color: #eee;
		font-weight: bold;
		border-radius: 2px;
		cursor: pointer;
	}
</style>
`;

const code_3 = `# What i wrote last week

Why am i so smart, how is this possible.
`;

const code_4 = `
<script>
	export let count = 0;
<\/script>

<span class="outer">
	<button on:click="{() => count = count - 1}">-</button>
	<span class="inner">{count}</span>
	<button on:click="{() => count = count + 1}">+</button>
</span>

<style>
	.outer {
		background: darkorange;
		height: 20px;
		font-size: 12px;
		display: inline-flex;
		justify-content: space-between;
		align-items: center;
		transform: translateY(-1px);
		margin: 0 5px;
		border-radius: 3px;
		width: 65px;
		box-shadow: 0 3px 15px 1px rgba(0,0,0,0.3)
  }

	.inner {
		margin: 0 0px;
  }

	button {
		height: 20px;
		padding: 0px 7px 1px 7px;
		margin: 0;
		border: none;
		background: none;
		color: #eee;
		font-weight: bold;
		cursor: pointer;
	}
</style>
`;
const code_5 = `
<div><slot></slot></div>

<style>
	div {
		background: pink;
		border: 23px solid orange;
		padding: 0 15px;
		width: 400px;
		text-align: center;
		transform: translateX(-200px);
		animation: 2s slide infinite alternate ease-in-out;
  }

	@keyframes slide {
		from {
			transform: translateX(-200px)
		}
		to {
			transform: translateX(200px)
		}
	}
</style>
`;

/* src/Playground.svelte generated by Svelte v3.49.0 */

function create_if_block(ctx) {
	let div1;
	let div0;
	let label0;
	let t1;
	let span2;
	let input0;
	let t2;
	let input1;
	let t3;
	let span0;
	let t4;
	let span1;
	let t5;
	let label1;
	let mounted;
	let dispose;

	return {
		c() {
			div1 = element("div");
			div0 = element("div");
			label0 = element("label");
			label0.textContent = "input";
			t1 = space();
			span2 = element("span");
			input0 = element("input");
			t2 = space();
			input1 = element("input");
			t3 = space();
			span0 = element("span");
			t4 = space();
			span1 = element("span");
			t5 = space();
			label1 = element("label");
			label1.textContent = "output";
			attr(label0, "for", "input");
			attr(label0, "class", "svelte-tjfddm");
			attr(input0, "type", "radio");
			attr(input0, "name", "theme");
			attr(input0, "id", "input");
			input0.__value = "input";
			input0.value = input0.__value;
			attr(input0, "class", "svelte-tjfddm");
			/*$$binding_groups*/ ctx[8][0].push(input0);
			attr(input1, "type", "radio");
			attr(input1, "name", "theme");
			attr(input1, "id", "output");
			input1.__value = "output";
			input1.value = input1.__value;
			attr(input1, "class", "svelte-tjfddm");
			/*$$binding_groups*/ ctx[8][0].push(input1);
			attr(span0, "aria-hidden", "true");
			attr(span0, "class", "toggle-background svelte-tjfddm");
			attr(span1, "aria-hidden", "true");
			attr(span1, "class", "toggle-switcher svelte-tjfddm");
			attr(span2, "class", "toggle-wrapper svelte-tjfddm");
			attr(label1, "for", "output");
			attr(label1, "class", "svelte-tjfddm");
			attr(div0, "class", "toggle svelte-tjfddm");
			attr(div1, "class", "toggle-wrap svelte-tjfddm");
		},
		m(target, anchor) {
			insert(target, div1, anchor);
			append(div1, div0);
			append(div0, label0);
			append(div0, t1);
			append(div0, span2);
			append(span2, input0);
			input0.checked = input0.__value === /*checked*/ ctx[2];
			append(span2, t2);
			append(span2, input1);
			input1.checked = input1.__value === /*checked*/ ctx[2];
			append(span2, t3);
			append(span2, span0);
			append(span2, t4);
			append(span2, span1);
			append(div0, t5);
			append(div0, label1);

			if (!mounted) {
				dispose = [
					listen(input0, "change", /*input0_change_handler*/ ctx[7]),
					listen(input1, "change", /*input1_change_handler*/ ctx[9]),
					listen(span0, "click", /*handle_select*/ ctx[4]),
					listen(span1, "click", /*handle_select*/ ctx[4])
				];

				mounted = true;
			}
		},
		p(ctx, dirty) {
			if (dirty & /*checked*/ 4) {
				input0.checked = input0.__value === /*checked*/ ctx[2];
			}

			if (dirty & /*checked*/ 4) {
				input1.checked = input1.__value === /*checked*/ ctx[2];
			}
		},
		d(detaching) {
			if (detaching) detach(div1);
			/*$$binding_groups*/ ctx[8][0].splice(/*$$binding_groups*/ ctx[8][0].indexOf(input0), 1);
			/*$$binding_groups*/ ctx[8][0].splice(/*$$binding_groups*/ ctx[8][0].indexOf(input1), 1);
			mounted = false;
			run_all(dispose);
		}
	};
}

function create_fragment$1(ctx) {
	let t0;
	let div1;
	let div0;
	let repl_1;
	let t1;
	let current;
	let mounted;
	let dispose;
	add_render_callback(/*onwindowresize*/ ctx[5]);

	let repl_1_props = {
		workersUrl: "/workers",
		fixed: /*is_mobile*/ ctx[3]
	};

	repl_1 = new Repl({ props: repl_1_props });
	/*repl_1_binding*/ ctx[6](repl_1);
	let if_block = /*is_mobile*/ ctx[3] && create_if_block(ctx);

	return {
		c() {
			t0 = space();
			div1 = element("div");
			div0 = element("div");
			create_component(repl_1.$$.fragment);
			t1 = space();
			if (if_block) if_block.c();
			document.title = "mdsvex playground!";
			attr(div0, "class", "inner svelte-tjfddm");
			toggle_class(div0, "offset", /*checked*/ ctx[2] === 'output');
			attr(div1, "class", "outer svelte-tjfddm");
			toggle_class(div1, "mobile", /*is_mobile*/ ctx[3]);
		},
		m(target, anchor) {
			insert(target, t0, anchor);
			insert(target, div1, anchor);
			append(div1, div0);
			mount_component(repl_1, div0, null);
			append(div1, t1);
			if (if_block) if_block.m(div1, null);
			current = true;

			if (!mounted) {
				dispose = listen(window, "resize", /*onwindowresize*/ ctx[5]);
				mounted = true;
			}
		},
		p(ctx, [dirty]) {
			const repl_1_changes = {};
			if (dirty & /*is_mobile*/ 8) repl_1_changes.fixed = /*is_mobile*/ ctx[3];
			repl_1.$set(repl_1_changes);

			if (dirty & /*checked*/ 4) {
				toggle_class(div0, "offset", /*checked*/ ctx[2] === 'output');
			}

			if (/*is_mobile*/ ctx[3]) {
				if (if_block) {
					if_block.p(ctx, dirty);
				} else {
					if_block = create_if_block(ctx);
					if_block.c();
					if_block.m(div1, null);
				}
			} else if (if_block) {
				if_block.d(1);
				if_block = null;
			}

			if (dirty & /*is_mobile*/ 8) {
				toggle_class(div1, "mobile", /*is_mobile*/ ctx[3]);
			}
		},
		i(local) {
			if (current) return;
			transition_in(repl_1.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(repl_1.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(t0);
			if (detaching) detach(div1);
			/*repl_1_binding*/ ctx[6](null);
			destroy_component(repl_1);
			if (if_block) if_block.d();
			mounted = false;
			dispose();
		}
	};
}

function instance$1($$self, $$props, $$invalidate) {
	let is_mobile;
	let repl;
	let checked = "input";
	let width;

	onMount(() => {
		repl.set({
			components: [
				{ type: "svx", name: "App", source: code_1 },
				{
					type: "svelte",
					name: "Boinger",
					source: code_2
				},
				{
					type: "svx",
					name: "Section",
					source: code_3
				},
				{
					type: "svelte",
					name: "Count",
					source: code_4
				},
				{
					type: "svelte",
					name: "Seriously",
					source: code_5
				}
			]
		});
	});

	function handle_select() {
		$$invalidate(2, checked = checked === "input" ? "output" : "input");
	}

	const $$binding_groups = [[]];

	function onwindowresize() {
		$$invalidate(0, width = window.innerWidth);
	}

	function repl_1_binding($$value) {
		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
			repl = $$value;
			$$invalidate(1, repl);
		});
	}

	function input0_change_handler() {
		checked = this.__value;
		$$invalidate(2, checked);
	}

	function input1_change_handler() {
		checked = this.__value;
		$$invalidate(2, checked);
	}

	$$self.$$.update = () => {
		if ($$self.$$.dirty & /*width*/ 1) {
			$$invalidate(3, is_mobile = width < 750);
		}
	};

	return [
		width,
		repl,
		checked,
		is_mobile,
		handle_select,
		onwindowresize,
		repl_1_binding,
		input0_change_handler,
		$$binding_groups,
		input1_change_handler
	];
}

class Playground extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});
	}
}

/* src/counter.svelte generated by Svelte v3.49.0 */

function create_fragment(ctx) {
	let button;
	let t0;
	let t1;
	let t2;
	let t3_value = (/*count*/ ctx[0] === 1 ? 'time' : 'times') + "";
	let t3;
	let mounted;
	let dispose;

	return {
		c() {
			button = element("button");
			t0 = text("Clicked ");
			t1 = text(/*count*/ ctx[0]);
			t2 = space();
			t3 = text(t3_value);
		},
		m(target, anchor) {
			insert(target, button, anchor);
			append(button, t0);
			append(button, t1);
			append(button, t2);
			append(button, t3);

			if (!mounted) {
				dispose = listen(button, "click", /*handleClick*/ ctx[1]);
				mounted = true;
			}
		},
		p(ctx, [dirty]) {
			if (dirty & /*count*/ 1) set_data(t1, /*count*/ ctx[0]);
			if (dirty & /*count*/ 1 && t3_value !== (t3_value = (/*count*/ ctx[0] === 1 ? 'time' : 'times') + "")) set_data(t3, t3_value);
		},
		i: noop,
		o: noop,
		d(detaching) {
			if (detaching) detach(button);
			mounted = false;
			dispose();
		}
	};
}

function instance($$self, $$props, $$invalidate) {
	let count = 0;

	function handleClick() {
		$$invalidate(0, count += 1);
	}

	return [count, handleClick];
}

class Counter extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, instance, create_fragment, safe_not_equal, {});
	}
}

module.exports = {
    Counter,
    Playground,
};
