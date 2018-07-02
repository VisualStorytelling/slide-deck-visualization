export const bla = 'bla';

import { ProvenanceNode, ProvenanceGraphTraverser } from '@visualstorytelling/provenance-core';

export type Annotation = any;

export class ProvenanceSlide { 
    private _node: ProvenanceNode | null;
    private _name: string;
    private _duration: number;
    private _delay: number;
    private _annotations: Annotation[];

	public get node(): ProvenanceNode | null  {
		return this._node;
	}

	public set node(value: ProvenanceNode | null ) {
		this._node = value;
    }
    
	public get name(): string {
		return this._name;
	}

	public set name(value: string) {
		this._name = value;
	}

	public get duration(): number {
		return this._duration;
	}

	public set duration(value: number) {
		this._duration = value;
	}

	public get delay(): number {
		return this._delay;
	}

	public set delay(value: number) {
		this._delay = value;
    }
    
    public addAnnotation(annotation: Annotation) {
        this._annotations.push(annotation);
    }

    public removeAnnotation(annotation: Annotation) {
        const index = this._annotations.indexOf(annotation);
        this._annotations.splice(index, 1);
    }

    public get annotations() {
        return this._annotations;
    }

    constructor(name: string, duration: number, delay: number, annotations: Annotation[] = [], node: (ProvenanceNode | null) = null) {
        this._name = name;
        this._duration = duration;
        this._delay = delay;
        this._annotations = annotations;
        this._node = node;
    }
}
