import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';

// Assumindo que MaterialModule e MaterialExtensionsModule são módulos que importam/exportam os componentes do Material
import { MaterialModule } from '../material.module';
import { MaterialExtensionsModule } from '../material-extensions.module';

// Formly
import { FormlyModule } from '@ngx-formly/core';
import { FormlyMaterialModule } from '@ngx-formly/material';

// Outras libs
import { NgProgressbarModule } from 'ngx-progressbar'; // Importar o MÓDULO
import { NgProgressRouterModule } from 'ngx-progressbar/router'; // Importar o MÓDULO
import { NgxPermissionsModule } from 'ngx-permissions';
import { ToastrModule } from 'ngx-toastr';
import { TranslateModule } from '@ngx-translate/core';

// Componentes, Diretivas e Pipes declarados/exportados por este Módulo
import { BreadcrumbComponent } from './components/breadcrumb/breadcrumb.component';
import { PageHeaderComponent } from './components/page-header/page-header.component';
import { ErrorCodeComponent } from './components/error-code/error-code.component';
import { DisableControlDirective } from './directives/disable-control.directive';
import { SafeUrlPipe } from './pipes/safe-url.pipe';
import { ToObservablePipe } from './pipes/to-observable.pipe';

// Agrupamentos para clareza (opcional, mas ajuda na leitura)
const MODULES: any[] = [
  CommonModule,
  RouterModule,
  ReactiveFormsModule,
  FormsModule,
  MaterialModule,
  MaterialExtensionsModule,
  FormlyModule,
  FormlyMaterialModule,
  NgxPermissionsModule,
  ToastrModule,
  TranslateModule,
  NgProgressbarModule, // Usar o Módulo aqui
  NgProgressRouterModule, // Usar o Módulo aqui
];

const COMPONENTS: any[] = [
  BreadcrumbComponent,
  PageHeaderComponent,
  ErrorCodeComponent,
];

const DIRECTIVES: any[] = [
  DisableControlDirective,
];

const PIPES: any[] = [
  SafeUrlPipe,
  ToObservablePipe,
];

@NgModule({
  // Módulos que este módulo precisa importar para que seus componentes/diretivas funcionem
  imports: [
    ...MODULES,
    // FormlyModule.forChild() ou configurações específicas podem vir aqui também, se necessário
  ],
  // Componentes, Diretivas e Pipes que este módulo declara (cria)
  declarations: [
    ...COMPONENTS,
    ...DIRECTIVES,
    ...PIPES,
  ],
  // Tudo (Módulos, Componentes, Diretivas, Pipes) que este módulo torna disponível para outros módulos que o importarem
  exports: [
    ...MODULES,
    ...COMPONENTS,
    ...DIRECTIVES,
    ...PIPES,
  ],
})
export class SharedModule {}
