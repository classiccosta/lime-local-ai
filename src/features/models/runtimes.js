// Provider ids as the services report them, paired with the words the design
// uses for them. Kept out of the component file so both it and App can import
// the list without tripping Fast Refresh.
export const RUNTIMES = [
  { id: 'Web-GPU', label: 'WebGPU' },
  { id: 'LM-Studio', label: 'Endpoint' },
];
