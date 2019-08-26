import {
    SlideAnnotation,
    IProvenanceSlide
} from "@visualstorytelling/provenance-core";
import { AnnotationDisplay, PositionedString } from "./annotation-display";

export class AnnotationDisplayContainer {
    private _annotationDisplayMap: Map<
        SlideAnnotation<PositionedString>,
        AnnotationDisplay
    >;
    private readonly _rootElement: HTMLDivElement;
    constructor() {
        this._annotationDisplayMap = new Map<
            SlideAnnotation<PositionedString>,
            AnnotationDisplay
        >();
        this._rootElement = document.createElement("div");
        this._rootElement.id = "annotation-container";
        document.body.appendChild(this._rootElement);
    }

    add(annotation: SlideAnnotation<PositionedString>, editMode = false) {
        if (!this._annotationDisplayMap.has(annotation)) {
            const annotationDisplay = new AnnotationDisplay(annotation, {
                editable: editMode,
                container: this._rootElement
            });
            this._annotationDisplayMap.set(annotation, annotationDisplay);
        }
    }

    remove(annotation: SlideAnnotation<PositionedString>) {
        const annotationDisplay = this._annotationDisplayMap.get(annotation);
        if (annotationDisplay) {
            this._annotationDisplayMap.delete(annotation);
            annotationDisplay.remove();
        }
    }

    clear() {
        this._annotationDisplayMap.forEach(annotationDisplay =>
            annotationDisplay.remove()
        );
        this._annotationDisplayMap.clear();
    }

    public loadForSlide(slide: IProvenanceSlide) {
        this.clear();
        slide.annotations.forEach(annotation => {
            if (
                annotation.data &&
                annotation.data.value &&
                annotation.data.x &&
                annotation.data.y
            ) {
                this.add(annotation as SlideAnnotation<PositionedString>);
            }
        });
    }
}
