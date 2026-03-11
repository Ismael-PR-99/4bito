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

@Component({
  selector: 'app-anadir-producto',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './anadir-producto.component.html',
  styleUrl: './anadir-producto.component.css',
})
export class AnadirProductoComponent implements OnInit {
  @Input()  categoriaSlug: string = '';
  @Output() cerrar         = new EventEmitter<void>();
  @Output() productoCreado = new EventEmitter<ProductoApi>();

  private fb              = inject(FormBuilder);
  private productosService = inject(ProductosService);

  form!: FormGroup;
  imagenPreview: string | null = null;
  imagenFile: File | null = null;
  enviando   = false;
  errorMsg   = '';
  readonly TALLAS_DISPONIBLES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
  readonly anioActual = new Date().getFullYear();

  esCategoriaConMedidas(slug: string): boolean {
    return ['retro-cuadros', 'retro-objetos'].includes(slug);
  }

  get conMedidas(): boolean {
    return this.esCategoriaConMedidas(this.categoriaSlug);
  }

  readonly CATEGORIAS = [
    { value: 'camisetas',       label: 'Camisetas Retro' },
    { value: 'cuadros',         label: 'Cuadros Retro' },
    { value: 'objetos',         label: 'Objetos Retro' },
    { value: 'coleccionismo',   label: 'Coleccionismo' },
    { value: 'accesorios',      label: 'Accesorios' },
  ];

  ngOnInit(): void {
    this.form = this.fb.group({
      name:     ['', [Validators.required, Validators.minLength(3)]],
      team:     ['', [Validators.required, Validators.minLength(2)]],
      league:   ['', [Validators.required, Validators.minLength(2)]],
      price:    [null, [Validators.required, Validators.min(0.01)]],
      year:     [null, [Validators.required, Validators.min(1900), Validators.max(this.anioActual)]],
      category: [this.categoriaSlug || '', Validators.required],
      sizes:    this.fb.array([this.newTallaGroup()]),
    });
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

  addTalla(): void {
    this.sizes.push(this.newTallaGroup());
  }

  removeTalla(i: number): void {
    if (this.sizes.length > 1) this.sizes.removeAt(i);
  }

  // ── Control helper para el template ────────────────────────────────────
  ctrl(name: string): AbstractControl {
    return this.form.get(name)!;
  }

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

    this.imagenFile   = file;
    this.errorMsg     = '';
    const reader      = new FileReader();
    reader.onload     = e => (this.imagenPreview = e.target?.result as string);
    reader.readAsDataURL(file);
  }

  // ── Envío ───────────────────────────────────────────────────────────────
  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    if (!this.imagenFile) {
      this.errorMsg = 'La imagen de la camiseta es obligatoria';
      return;
    }

    this.enviando = true;
    this.errorMsg = '';

    const fd = new FormData();
    const v  = this.form.value;
    fd.append('name',     v.name);
    fd.append('team',     v.team);
    fd.append('league',   v.league);
    fd.append('price',    String(v.price));
    fd.append('year',     String(v.year));
    fd.append('category', v.category);
    fd.append('sizes',    JSON.stringify(v.sizes));
    fd.append('image',    this.imagenFile);

    this.productosService.crear(fd).subscribe({
      next: (res: { mensaje: string; producto: ProductoApi }) => {
        this.enviando = false;
        this.productoCreado.emit(res.producto);
        this.cerrar.emit();
      },
      error: (err: { error?: { error?: string } }) => {
        this.enviando = false;
        this.errorMsg = err?.error?.error || 'Error al crear el producto';
      },
    });
  }

  cancelar(): void {
    this.cerrar.emit();
  }
}
