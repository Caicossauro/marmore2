export function mascaraTelefone(valor) {
  const d = valor.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 10) {
    return d
      .replace(/^(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d)/, '$1-$2');
  }
  return d
    .replace(/^(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2');
}

export function mascaraCpfCnpj(valor) {
  const d = valor.replace(/\D/g, '').slice(0, 14);
  if (d.length <= 11) {
    return d
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  }
  return d
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
}

export function mascaraRg(valor) {
  const limpo = valor.replace(/[^0-9Xx]/g, '').toUpperCase().slice(0, 9);
  if (limpo.length <= 2) return limpo;
  if (limpo.length <= 5) return `${limpo.slice(0, 2)}.${limpo.slice(2)}`;
  if (limpo.length <= 8) return `${limpo.slice(0, 2)}.${limpo.slice(2, 5)}.${limpo.slice(5)}`;
  return `${limpo.slice(0, 2)}.${limpo.slice(2, 5)}.${limpo.slice(5, 8)}-${limpo.slice(8)}`;
}

export function validarCpf(cpf) {
  const apenasDigitos = cpf.replace(/\D/g, '');
  if (apenasDigitos.length !== 11 || /^([0-9])\1{10}$/.test(apenasDigitos)) {
    return false;
  }

  const validarDigito = (numeros, pesoInicial) => {
    const total = numeros
      .split('')
      .reduce((acc, digito, indice) => acc + Number(digito) * (pesoInicial - indice), 0);
    const resto = total % 11;
    return String(resto < 2 ? 0 : 11 - resto);
  };

  const base = apenasDigitos.slice(0, 9);
  const digito1 = validarDigito(base, 10);
  const digito2 = validarDigito(base + digito1, 11);
  return apenasDigitos.endsWith(digito1 + digito2);
}

export function validarCnpj(cnpj) {
  const apenasDigitos = cnpj.replace(/\D/g, '');
  if (apenasDigitos.length !== 14 || /^([0-9])\1{13}$/.test(apenasDigitos)) {
    return false;
  }

  const calcularDigito = (numeros, pesos) => {
    const total = numeros
      .split('')
      .reduce((acc, digito, indice) => acc + Number(digito) * pesos[indice], 0);
    const resto = total % 11;
    return String(resto < 2 ? 0 : 11 - resto);
  };

  const base = apenasDigitos.slice(0, 12);
  const digito1 = calcularDigito(base, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const digito2 = calcularDigito(base + digito1, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return apenasDigitos.endsWith(digito1 + digito2);
}

export function validarCpfCnpj(valor) {
  const apenasDigitos = valor.replace(/\D/g, '');
  if (!apenasDigitos) return true;
  if (apenasDigitos.length === 11) return validarCpf(valor);
  if (apenasDigitos.length === 14) return validarCnpj(valor);
  return false;
}

export function validarRg(valor) {
  const limpo = valor.replace(/[^0-9Xx]/g, '');
  return limpo.length >= 7 && limpo.length <= 9;
}
