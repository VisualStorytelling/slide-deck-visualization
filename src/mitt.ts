import { Handler } from '@visualstorytelling/provenance-core';

/** Mitt: Tiny (~200b) functional event emitter / pubsub.
 *  https://github.com/developit/mitt
 *  commit: 820ac6a172efbbd472e0a802ffad6a882f0cbb27
 *  MIT Licence
 *    Copyright 2018 Jason Miller
 *    Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
 *    The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
 *    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 *  @name mitt
 *  @author Jason Miller
 *  @returns {Mitt}
 */

export default function mitt(all?: any) {
  all = all || Object.create(null);

  return {
    /**
     * Register an event handler for the given type.
     *
     * @param  {String} type	Type of event to listen for
     * @param  {Function} handler Function to call in response to given event
     * @memberOf mitt
     */
    on(type: string, handler: Handler) {
      (all[type] || (all[type] = [])).push(handler);
    },

    /**
     * Remove an event handler for the given type.
     *
     * @param  {String} type	Type of event to unregister `handler` from
     * @param  {Function} handler Handler function to remove
     * @memberOf mitt
     */
    off(type: string, handler: Handler) {
      if (all[type]) {
        all[type].splice(all[type].indexOf(handler) >>> 0, 1);
      }
    },

    /**
     * Invoke all handlers for the given type.
     *
     * @param {String} type  The event type to invoke
     * @param {Any} [evt]  Any value (object is recommended and powerful), passed to each handler
     * @memberOf mitt
     */
    emit(type: string, evt: any) {
      (all[type] || []).slice().map((handler: Handler) => {
        handler(evt);
      });
    }
  };
}
