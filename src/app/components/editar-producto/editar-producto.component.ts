import {
  Component,
  EventEmitter,
  Output,
  Input,
  inject,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  FormArray,
  Validators,
  AbstractControl,
} from '@angular/forms';
import { ProductosService, ProductoApi } from '../../services/productos.service';
import { Producto } from '../../models/producto.model';

@Component({
  selector: 'app-editar-producto',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './editar-producto.component.html',
  styleUrl: './editar-producto.component.css',
})
export class EditarProductoComponent implements OnInit {
  @Input()  producto!: Producto;
  @Output() cerrar              = new EventEmitter<void>();
  @Output() productoActualizado = new EventEmitter<ProductoApi>();

  private fb               = inject(FormBuilder);
  private productosService = inject(ProductosService);

  form!: FormGroup;
  imagenPreview: string | null = null;
  imagenFile:    File | null   = null;
  enviando  = false;
  errorMsg  = '';
  readonly TALLAS_DISPONIBLES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
  readonly anioActual = new Date().getFullYear();

  ngOnInit(): void {
    // Prellenar el formulario con los datos actuales del producto
    this.form = this.fb.group({
      name:   [this.producto.nombre,  [Validators.required, Validators.minLength(3)]],
      team:   [this.producto.equipo ?? '', [Validators.required, Validators.minLength(2)]],
      league: [this.extraerLiga(),    [Validators.required, Validators.minLength(2)]],
      price:  [this.producto.precio,  [Validators.required, Validators.min(0.01)]],
      year:   [this.producto.anio ?? null, [Validators.required, Validators.min(1900), Validators.max(this.anioActual)]],
      sizes:  this.fb.array(
        this.producto.tallas.length
          ? this.producto.tallas.map(t => this.fb.group({
              size:  [t, Validators.required],
              stock: [1, [Validators.required, Validators.min(0)]],
            }))
          : [this.newTallaGroup()]
      ),
    });

    // Mostrar la imagen actual como preview
    this.imagenPreview = this.producto.imageUrl;
  }

  /** Extrae la liga del campo descripción: "Equipo — Liga" */
  private extraerLiga(): string {
    const desc = this.producto.descripcion ?? '';
    const parts = desc.split('—');
    return parts.length > 1 ? parts[1].trim() : '';
  }

  // ── FormArray helpers ───────────────────────────────────────────────────
  get sizes(): FormArray {
    return this.form.get('sizes') as FormArray;
  }

  newTallaGroup(): FormGroup {
    return this.fb.group({
      size:  ['', Validators.required],
      stock: [1,  [Validators.required, Validators.min(0)]],
    });
  }

  addTalla(): void  { this.sizes.push(this.newTallaGroup()); }
  removeTalla(i: number): void { if (this.sizes.length > 1) this.sizes.removeAt(i); }

  ctrl(name: string): AbstractControl { return this.form.get(name)!; }

  // ── Imagen ─────────────────────────────────────────────────────────────
  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file  = input.files?.[0];
    if (!file) return;

    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
      this.errorMsg = 'Solo se permiten imágenes JPG, PNG o WEBP';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      this.errorMsg = 'La imagen no puede superar 5 MB';
      return;
    }

    this.imagenFile = file;
    this.errorMsg   = '';
    const reader    = new FileReader();
    reader.onload   = e => (this.imagenPreview = e.target?.result as string);
    reader.readAsDataURL(file);
  }

  // ── Envío ───────────────────────────────────────────────────────────────
  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.enviando = true;
    this.errorMsg = '';

    const fd = new FormData();
    const v  = this.form.value;
    fd.append('name',   v.name);
    fd.append('team',   v.team);
    fd.append('league', v.league);
    fd.append('price',  String(v.price));
    fd.append('year',   String(v.year));
    fd.append('sizes',  JSON.stringify(v.sizes));
    if (this.imagenFile) {
      fd.append('image', this.imagenFile);
    }

    this.productosService.actualizar(this.producto.id, fd).subscribe({
      next: (res) => {
        this.enviando = false;
        this.productoActualizado.emit(res.producto);
        this.cerrar.emit();
      },
      error: (err: { error?: { error?: string } }) => {
        this.enviando = false;
        this.errorMsg = err?.error?.error || 'Error al actualizar el producto';
      },
    });
  }

  cancelar(): void { this.cerrar.emit(); }
}
