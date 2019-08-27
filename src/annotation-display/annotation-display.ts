import EasyMDE from "easymde";
import "./easymde.css";
import "./style.css";

import { SlideAnnotation } from "@visualstorytelling/provenance-core";

export interface Options {
    initialValue: string;
    editable: boolean;
    container: HTMLElement;
}

export const defaultOptions = {
    initialValue: "",
    editable: false,
    container: document.body
};

export type PositionedString = {
    x: number;
    y: number;
    value: string;
};

/*
 * https://github.com/sparksuite/simplemde-markdown-editor
 * https://codemirror.net/doc/manual.html#operation
 */
export class AnnotationDisplay {
    private _rootElement: HTMLElement;
    private _options: Options;
    private _mde: EasyMDE;
    private _annotation: SlideAnnotation<PositionedString>;
    private _editable: boolean = false;

    setPosition() {
        if (this._annotation.data) {
            this._rootElement.style.left = this._annotation.data.x + "px";
            this._rootElement.style.top = this._annotation.data.y + "px";
        }
    }

    constructor(
        annotation: SlideAnnotation<PositionedString>,
        options: Partial<Options> = {}
    ) {
        this._annotation = annotation;
        this._options = { ...defaultOptions, ...options };
        if (!annotation.data) {
            throw Error("No annotation data");
        }
        const id = `annotation${this._annotation.id}`;
        if (document.getElementById(id)) {
            throw new Error(
                "Already an instance for annotation with id " +
                    this._annotation.id
            );
        }
        this._rootElement = document.createElement("div");
        this._rootElement.id = `annotation${this._annotation.id}`;
        this._rootElement.className = "provenanceAnnotation";
        this._rootElement.innerHTML = "";
        this._rootElement.draggable = true;
        const textArea = document.createElement("textarea");
        textArea.value = this._annotation.data
            ? this._annotation.data.value
            : "";
        this._rootElement.appendChild(textArea);
        this._options.container.appendChild(this._rootElement);
        this._mde = new EasyMDE({
            element: textArea,
            autofocus: true,
            status: false,
            hideIcons: ["preview", "guide", "side-by-side", "fullscreen"]
        });
        this._mde.codemirror.on("change", () => {
            this._annotation.data!.value = this._mde.codemirror.getValue();
        });

        const toolbar = this._rootElement.querySelector(
            ".editor-toolbar"
        ) as HTMLDivElement;

        // setup handlers that allow drag moving the annotations
        this._rootElement.addEventListener("dragstart", e => {
            const domRect = toolbar.getBoundingClientRect();
            const handleOffsetX = e.clientX - domRect.left;
            const handleOffsetY = e.clientY - domRect.top;
            const dragEndHandler = (e: MouseEvent) => {
                if (this._annotation.data) {
                    this._annotation.data.x = e.clientX - handleOffsetX;
                    this._annotation.data.y = e.clientY - handleOffsetY;
                    this.setPosition();
                }
                this._rootElement.removeEventListener(
                    "dragend",
                    dragEndHandler
                );
            };
            this._rootElement.addEventListener("dragend", dragEndHandler);
        });

        /* This is triggered immediately after creation because it's e.g. from a button press
         *  That's why there is the setTimeout below..
         * */
        document.addEventListener("click", e => {
            const clickedOnThis = !!(e as any).target.closest(
                `#${this._rootElement.id}`
            );
            if (!this.editable && clickedOnThis) {
                this.editable = true;
            }
            if (this.editable && !clickedOnThis) {
                this.editable = false;
            }
        });

        // set initial position (sets css 'left' and 'right' properties)
        this.setPosition();

        /* To get around the problem that the outside click is sometimes
       immediately triggered
     */
        setTimeout(() => {
            this.editable = this._options.editable;
        });
    }

    remove() {
        this._options.container.removeChild(this._rootElement);
    }

    get editable(): boolean {
        return this._editable;
    }

    set editable(editable: boolean) {
        this._editable = editable;

        /* The preview from SimpleMDE is what we want when not in edit mode.
         *  Bit of a workaround because the API only allows Toggle and not Set to value.
         *  */
        if (!this.editable && !this._mde.isPreviewActive()) {
            (this._mde as any).togglePreview();
        }

        if (this.editable && this._mde.isPreviewActive()) {
            (this._mde as any).togglePreview();
        }

        this._mde.codemirror.setOption('readOnly', editable ? false : "nocursor");

        if (editable) {
            this._mde.codemirror.focus();
            this._mde.codemirror.getInputField().focus();
        } else {
            this._mde.codemirror.getInputField().blur();
        }
        this._rootElement.classList.toggle("editable", editable);
    }

    get rootElement(): HTMLElement {
        return this._rootElement;
    }
}
