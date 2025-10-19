from typing import Iterable, List, TypeVar, AsyncIterator, Callable, Awaitable
import asyncio

T = TypeVar("T")
R = TypeVar("R")

# PUBLIC_INTERFACE
def chunked(iterable: Iterable[T], size: int) -> List[List[T]]:
    """Yield fixed-size chunks from iterable."""
    batch: List[T] = []
    for item in iterable:
        batch.append(item)
        if len(batch) >= size:
            yield batch
            batch = []
    if batch:
        yield batch

# PUBLIC_INTERFACE
async def run_in_batches(
    items: List[T],
    handler: Callable[[List[T]], Awaitable[List[R]]],
    batch_size: int,
    max_concurrency: int,
) -> List[R]:
    """Run async handler over items in batches with limited concurrency, gathering all results."""
    semaphore = asyncio.Semaphore(max_concurrency)
    results: List[R] = []

    async def run_one(batch: List[T]) -> List[R]:
        async with semaphore:
            return await handler(batch)

    tasks = [asyncio.create_task(run_one(batch)) for batch in chunked(items, batch_size)]
    for task in tasks:
        try:
            res = await task
            results.extend(res or [])
        except Exception:
            # continue on individual batch failure
            continue
    return results
