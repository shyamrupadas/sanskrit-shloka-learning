type StatusResponse = {
  status(code: number): unknown;
};

type ContractResponse = {
  status: number;
  body?: unknown;
};

export function sendContractResponse(
  response: StatusResponse,
  contractResponse: ContractResponse,
): unknown {
  response.status(contractResponse.status);

  if ("body" in contractResponse) {
    return contractResponse.body;
  }

  return undefined;
}
