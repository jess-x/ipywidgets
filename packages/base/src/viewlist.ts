// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

/**
 * - create_view and remove_view are default functions called when adding or removing views
 * - create_view takes a model and an index and returns a view or a promise for a view for that model
 * - remove_view takes a view and destroys it (including calling `view.remove()`)
 * - each time the update() function is called with a new list, the create and remove
 *   callbacks will be called in an order so that if you append the views created in the
 *   create callback and remove the views in the remove callback, you will duplicate
 *   the order of the list.
 * - the remove callback defaults to just removing the view (e.g., pass in null for the second parameter)
 * - the context defaults to the created ViewList.  If you pass another context, the create and remove
 *   will be called in that context.
 */
export
class ViewList<T> {
    constructor(create_view: (model: any, index: any) => T | Promise<T>, remove_view: (view: T) => void, context: any) {
        this.initialize(create_view, remove_view, context);
    }

    initialize(create_view: (model: any, index: any) => T | Promise<T>, remove_view: (view: T) => void, context: any): void {
        this._handler_context = context || this;
        this._models = [];
        this.views = []; // list of promises for views
        this._create_view = create_view;
        this._remove_view = remove_view || function(view): void { (view as any).remove(); };
    }

    /**
     * the create_view, remove_view, and context arguments override the defaults
     * specified when the list is created.
     * after this function, the .views attribute is a list of promises for views
     * if you want to perform some action on the list of views, do something like
     * `Promise.all(myviewlist.views).then(function(views) {...});`
     */
    update(new_models: any[], create_view?: (model: any, index: any) => T | Promise<T>, remove_view?: (view: T) => void, context?: any): Promise<T[]> {
        const remove = remove_view || this._remove_view;
        const create = create_view || this._create_view;
        context = context || this._handler_context;
        let i = 0;
        // first, skip past the beginning of the lists if they are identical
        for (; i < new_models.length; i++) {
            if (i >= this._models.length || new_models[i] !== this._models[i]) {
                break;
            }
        }
        const first_removed = i;
        // Remove the non-matching items from the old list.
        const removed = this.views.splice(first_removed, this.views.length - first_removed);
        for (let j = 0; j < removed.length; j++) {
            removed[j].then(function(view) {
                remove.call(context, view);
            });
        }

        // Add the rest of the new list items.
        for (; i < new_models.length; i++) {
            this.views.push(Promise.resolve(create.call(context, new_models[i], i)));
        }
        // make a copy of the input array
        this._models = new_models.slice();
        // return a promise that resolves to all of the resolved views
        return Promise.all(this.views);
    }

    /**
     * removes every view in the list; convenience function for `.update([])`
     * that should be faster
     * returns a promise that resolves after this removal is done
     */
    remove(): Promise<void> {
        return Promise.all(this.views).then((views) => {
            views.forEach((value) => this._remove_view.call(this._handler_context, value));
            this.views = [];
            this._models = [];
        });
    }

    /**
     * Dispose this viewlist.
     *
     * A synchronous function which just deletes references to child views. This
     * function does not call .remove() on child views because that is
     * asynchronous. Use this in cases where child views will be removed in
     * another way.
     */
    dispose(): void {
        this.views = null;
        this._models = null;
    }

    _handler_context: any;
    _models: any[];
    views: Promise<T>[];
    _create_view: (model: any, index: any) => T | Promise<T>;
    _remove_view: (view: T) => void;
}

